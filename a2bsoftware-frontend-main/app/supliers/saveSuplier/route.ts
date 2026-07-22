import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { uuidToBuffer } from "@/lib/uuid-binary";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const isUpdate = Boolean(body.id) && body.id !== 0 && body.id !== "0";

    let dataRedirect = "";
    if (body.data_redirect_ids) {
      dataRedirect = Array.isArray(body.data_redirect_ids)
        ? body.data_redirect_ids.join(",")
        : body.data_redirect_ids;
    }

    const vendorIdBuf = uuidToBuffer(String(body.vendor_id || ""));

    const data: any = {
      project_id: uuidToBuffer(String(body.project_id || "")),
      vendor_id: vendorIdBuf,
      cost_per_complete: parseFloat(body.cost_per_complete) || 0,
      complete_request: parseInt(body.complete_request) || 0,
      max_redirect: parseInt(body.max_redirect) || 0,
      data_redirect: dataRedirect,
      notes: body.notes || "",
      completeLink: body.completeLink || "",
      disqualifyLink: body.disqualifyLink || "",
      securityTermlink: body.securityTermlink || "",
      qoutafullLink: body.qoutafullLink || "",
      status: parseInt(body.status) || 1,
    };

    let message = "";
    if (!isUpdate) {
      const vendor = await prisma.vendor.findUnique({
        where: { id: vendorIdBuf }
      });
      data.internal_splier = vendor?.internal_panel || 0;
      data.id = uuidToBuffer(crypto.randomUUID());

      await prisma.manageSupplier.create({
        data
      });
      message = "Data was successfully stored";
    } else {
      await prisma.manageSupplier.update({
        where: { id: uuidToBuffer(String(body.id)) },
        data
      });
      message = "Data was successfully updated";
    }

    return NextResponse.json({
      success: true,
      message
    });
  } catch (err: any) {
    console.error("Error saving supplier allocation", err);
    return NextResponse.json({
      success: false,
      message: err.message || "Failed to save supplier"
    }, { status: 500 });
  }
}
