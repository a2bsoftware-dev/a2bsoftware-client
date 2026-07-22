import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { uuidToBuffer, bufferToUuid } from "@/lib/uuid-binary";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    let projectIdBuf: Uint8Array<ArrayBuffer>;
    try {
      projectIdBuf = uuidToBuffer(String(body.project_id || ""));
    } catch {
      return NextResponse.json({ success: false, error: "Invalid project ID" }, { status: 400 });
    }

    // 1. Get all vendors to sync missing allocations
    const vendors = await prisma.vendor.findMany();
    for (const vendor of vendors) {
      const exists = await prisma.manageSupplier.findFirst({
        where: {
          project_id: projectIdBuf,
          vendor_id: vendor.id
        }
      });

      if (!exists) {
        await prisma.manageSupplier.create({
          data: {
            id: uuidToBuffer(crypto.randomUUID()),
            project_id: projectIdBuf,
            vendor_id: vendor.id,
            securityTermlink: vendor.securityTermlink || "",
            completeLink: vendor.completeLink || "",
            qoutafullLink: vendor.qoutafullLink || "",
            disqualifyLink: vendor.disqualifyLink || "",
            internal_splier: vendor.internal_panel || 0
          }
        });
      }
    }

    // 2. Fetch allocations joined with vendors and projects
    const suppliers = await prisma.$queryRaw<any[]>`
      SELECT ms.*, v.vendorName, v.contactPerson,
             v.completeLink as vendorCompleteLink, v.disqualifyLink as vendorDisqualifyLink,
             v.qoutafullLink as vendorQoutafullLink, v.securityTermlink as vendorSecurityTermlink,
             v.id as vendorId, p.id as projectId, p.project_name
      FROM manage_suppliers ms
      LEFT JOIN vendors v ON v.id = ms.vendor_id
      LEFT JOIN projects p ON p.id = ms.project_id
      WHERE ms.project_id = ${projectIdBuf}
    `;

    // 3. Setup redirects data and options
    const showStatusOptions: Record<number, string> = {
      1: "Bidding",
      2: "Testing",
      3: "Running",
      4: "Hold",
      5: "Completed",
      6: "Awaiting-Ids",
      7: "Closed",
    };

    const gidBuffers = suppliers.map((s) => Buffer.from(s.id));

    // Fetch survey informations matching GIDs (allocation IDs)
    let surveyInformations: any[] = [];
    if (gidBuffers.length > 0) {
      surveyInformations = await prisma.startSurveyInformation.findMany({
        where: {
          gid: { in: gidBuffers }
        }
      });
    }

    const suppliersWithStats = suppliers.map((supplierRow) => {
      const supplier: any = { ...supplierRow };
      const supplierIdHex = Buffer.from(supplierRow.id).toString("hex");

      // Set link fallbacks
      supplier.completeLink = supplier.completeLink || supplier.vendorCompleteLink || "";
      supplier.disqualifyLink = supplier.disqualifyLink || supplier.vendorDisqualifyLink || "";
      supplier.qoutafullLink = supplier.qoutafullLink || supplier.vendorQoutafullLink || "";
      supplier.securityTermlink = supplier.securityTermlink || supplier.vendorSecurityTermlink || "";

      if (supplier.data_redirect) {
        supplier.data_redirect_ids = supplier.data_redirect.split(",");
      } else {
        supplier.data_redirect_ids = [];
      }

      supplier.showStatus = showStatusOptions[supplier.status] || "Testing";

      // Calculate counts
      let hits = 0;
      let complete = 0;
      let disqualify = 0;
      let quota_full = 0;
      let securityTerm = 0;
      let drop = 0;

      surveyInformations.forEach((info) => {
        if (info.gid && Buffer.from(info.gid).toString("hex") === supplierIdHex) {
          hits++;
          if (info.status === 1) complete++;
          else if (info.status === 2) disqualify++;
          else if (info.status === 3) quota_full++;
          else if (info.status === 4) securityTerm++;
          else if (info.status === 0) drop++;
        }
      });

      supplier.hits = hits;
      supplier.complete = complete;
      supplier.disqualify = disqualify;
      supplier.quota_full = quota_full;
      supplier.securityTerm = securityTerm;
      supplier.drop = drop;

      const abendondVal = hits > 0 ? ((hits - drop) * 100) / hits : 0;
      supplier.abendond = abendondVal.toFixed(2);

      const irVal = hits > 0 ? ((complete - disqualify) * 100) / hits : 0;
      supplier.ir = irVal.toFixed(2);

      // Convert binary id columns to UUID strings for the JSON response
      supplier.id = bufferToUuid(supplierRow.id);
      supplier.project_id = bufferToUuid(supplierRow.project_id);
      supplier.vendor_id = bufferToUuid(supplierRow.vendor_id);
      supplier.vendorId = bufferToUuid(supplierRow.vendorId);
      supplier.projectId = bufferToUuid(supplierRow.projectId);

      return supplier;
    });

    const project = await prisma.project.findUnique({
      where: { id: projectIdBuf },
      select: { cpc: true }
    });

    return NextResponse.json({
      success: true,
      project,
      suppliers: suppliersWithStats,
      data_redirect_ids: []
    });

  } catch (err: any) {
    console.error("Error loading suppliers allocation", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Failed to load suppliers"
    }, { status: 500 });
  }
}
