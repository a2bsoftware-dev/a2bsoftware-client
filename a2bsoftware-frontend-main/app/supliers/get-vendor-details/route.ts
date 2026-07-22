import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uuidToBuffer, bufferToUuid } from "@/lib/uuid-binary";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    let vendorIdBuf: Uint8Array<ArrayBuffer>;
    try {
      vendorIdBuf = uuidToBuffer(String(body.vendor_id || ""));
    } catch {
      return NextResponse.json({ success: false, error: "Invalid vendor ID" }, { status: 400 });
    }

    const vendorRow = await prisma.vendor.findUnique({
      where: { id: vendorIdBuf }
    });
    const vendor = vendorRow ? { ...vendorRow, id: bufferToUuid(vendorRow.id) } : null;

    return NextResponse.json({
      success: true,
      vendor
    });
  } catch (err: any) {
    console.error("Error loading vendor details", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Failed to load vendor details"
    }, { status: 500 });
  }
}
