import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { uuidToBuffer } from "@/lib/uuid-binary";

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pidStr = searchParams.get("pid") || "";
    const gidStr = searchParams.get("gid") || "";
    const user_id = searchParams.get("user_id") || searchParams.get("uid") || "";

    if (!UUID_RE.test(pidStr) || !UUID_RE.test(gidStr)) {
      return new NextResponse("Invalid survey parameters", { status: 400 });
    }

    const pidBuf = uuidToBuffer(pidStr);
    const gidBuf = uuidToBuffer(gidStr);

    if (!user_id) {
      return new NextResponse("Please supply a valid user_id parameter.", { status: 400 });
    }

    // 1. Fetch project details (narrowed select - Project's other UUID FK
    // columns are still mistyped as Char(36) in schema.prisma while actually
    // BINARY(16), so an unselected fetch of the full row would throw)
    const project = await prisma.project.findUnique({
      where: { id: pidBuf },
      select: { status: true, survey_link: true }
    });

    if (!project) {
      return new NextResponse("Survey project not found.", { status: 404 });
    }

    // Status validations
    if (project.status === 1) return new NextResponse("This project is in bidding stage", { status: 400 });
    if (project.status === 4) return new NextResponse("This project is in hold stage", { status: 400 });
    if (project.status === 5) return new NextResponse("This project is in complete stage", { status: 400 });
    if (project.status === 6) return new NextResponse("This project is in awaiting stage", { status: 400 });
    if (project.status === 7) return new NextResponse("This project is closed", { status: 400 });

    // 2. Check duplicate completes
    const alreadyExist = await prisma.startSurveyInformation.findFirst({
      where: {
        pid: pidBuf,
        gid: gidBuf,
        user_id
      }
    });

    if (alreadyExist) {
      return new NextResponse("User ID already participated in this survey.", { status: 400 });
    }

    // 3. Generate secure ref_id
    const ref_id = crypto.randomBytes(8).toString("hex").substring(0, 15);

    // 4. Extract client request headers for tracking
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "";

    let browser = "unrecognized browser";
    if (userAgent.includes("Chrome")) browser = "Google Chrome";
    else if (userAgent.includes("Firefox")) browser = "Mozilla Firefox";
    else if (userAgent.includes("Safari")) browser = "Safari";
    else if (userAgent.includes("Edge") || userAgent.includes("Edg")) browser = "Microsoft Edge";

    // 5. Store start survey transaction in database
    await prisma.startSurveyInformation.create({
      data: {
        id: uuidToBuffer(crypto.randomUUID()),
        pid: pidBuf,
        gid: gidBuf,
        user_id,
        ref_id,
        start_ip_address: ip,
        end_ip_address: null,
        status: 0,
        email: "",
        zip: "",
        age: "",
        gender: "",
        start_time: new Date(),
        browser,
        date: new Date()
      }
    });

    // 6. Build the final survey URL with target user_id template replaced
    let targetLink = project.survey_link || "";

    if (targetLink) {
      const parsedUrl = new URL(targetLink);
      parsedUrl.searchParams.set("user_id", ref_id);
      parsedUrl.searchParams.set("uid", ref_id);
      targetLink = parsedUrl.toString();
    }

    return NextResponse.redirect(targetLink);

  } catch (err: any) {
    console.error("Error initiating survey redirect", err);
    return new NextResponse("Failed to initialize survey.", { status: 500 });
  }
}
