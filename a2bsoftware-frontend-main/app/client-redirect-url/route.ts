import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") || "disqualify";
    const uid = searchParams.get("uid") || ""; // ref_id
    const checksum = searchParams.get("checksum") || searchParams.get("signature") || "";

    const fallbackUrl = `${request.nextUrl.origin}/dashboard`;

    if (!uid) {
      return NextResponse.redirect(fallbackUrl);
    }

    // 1. Find respondent record in start_survey_informations using ref_id
    const startInfo = await prisma.startSurveyInformation.findFirst({
      where: { ref_id: uid }
    });

    if (!startInfo || !startInfo.pid || !startInfo.gid) {
      console.warn(`Redirect callback UID not found: ${uid}`);
      return NextResponse.redirect(fallbackUrl);
    }

    // 2. Validate HMAC security if checksum is present
    let hmacValid = true;
    if (checksum) {
      const hmacKey = process.env.EXIT_HMAC_KEY || "56473a631eba11efa463002248af8db42EFM";
      const expectedInput = uid + statusParam;
      const expectedChecksum = crypto
        .createHmac("sha256", hmacKey)
        .update(expectedInput)
        .digest("hex");

      if (checksum !== expectedChecksum) {
        console.warn(`HMAC validation failed for exit redirect. Expected: ${expectedChecksum}, got: ${checksum}`);
        hmacValid = false;
      }
    }

    // Status Mapping
    let status = 2; // Default disqualify
    if (statusParam === "complete") status = 1;
    else if (statusParam === "disqualify") status = 2;
    else if (statusParam === "quotaFull" || statusParam === "quota_full") status = 3;
    else if (statusParam === "securityTerm" || statusParam === "security") status = 4;

    if (!hmacValid) {
      status = 4; // Override to security term status if HMAC validation fails
    }

    // 3. Update respondent status and end tracking details
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    await prisma.startSurveyInformation.update({
      where: { id: startInfo.id },
      data: {
        status,
        end_time: new Date(),
        end_ip_address: ip
      }
    });

    // 4. Fetch supplier allocation details
    const supplier = await prisma.manageSupplier.findFirst({
      where: {
        project_id: startInfo.pid,
        id: startInfo.gid // gid matches manage_suppliers.id
      }
    });

    if (!supplier) {
      return NextResponse.redirect(fallbackUrl);
    }

    // 5. Select callback link
    let vendorRedirect = "";
    if (status === 1) vendorRedirect = supplier.completeLink || "";
    else if (status === 2) vendorRedirect = supplier.disqualifyLink || "";
    else if (status === 3) vendorRedirect = supplier.qoutafullLink || "";
    else if (status === 4) vendorRedirect = supplier.securityTermlink || "";
    else vendorRedirect = supplier.disqualifyLink || "";

    if (!vendorRedirect) {
      // Fallback to vendor-level defaults
      const vendor = await prisma.vendor.findUnique({
        where: { id: supplier.vendor_id }
      });
      if (vendor) {
        if (status === 1) vendorRedirect = vendor.completeLink || "";
        else if (status === 2) vendorRedirect = vendor.disqualifyLink || "";
        else if (status === 3) vendorRedirect = vendor.qoutafullLink || "";
        else if (status === 4) vendorRedirect = vendor.securityTermlink || "";
        else vendorRedirect = vendor.disqualifyLink || "";
      }
    }

    if (!vendorRedirect) {
      return NextResponse.redirect(fallbackUrl);
    }

    // 6. Append original supplier tracking UID
    const originalUserId = startInfo.user_id;
    if (vendorRedirect.includes("?")) {
      vendorRedirect += `&Uid=${originalUserId}`;
    } else {
      vendorRedirect += `?Uid=${originalUserId}`;
    }

    return NextResponse.redirect(vendorRedirect);

  } catch (err: any) {
    console.error("Error executing client redirect callback", err);
    return new NextResponse("Failed to process callback.", { status: 500 });
  }
}
