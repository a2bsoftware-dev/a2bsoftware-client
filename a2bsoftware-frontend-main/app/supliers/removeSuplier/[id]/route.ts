import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uuidToBuffer } from "@/lib/uuid-binary";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let removeSuplierIdBuf: Uint8Array<ArrayBuffer>;
    try {
      removeSuplierIdBuf = uuidToBuffer(id);
    } catch {
      return NextResponse.json({ success: false, error: "Invalid supplier allocation ID" }, { status: 400 });
    }

    await prisma.manageSupplier.delete({
      where: { id: removeSuplierIdBuf }
    });

    return NextResponse.json({
      success: true,
      message: "Data was successfully Deleted"
    });
  } catch (err: any) {
    console.error("Error removing supplier allocation", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Failed to remove supplier"
    }, { status: 500 });
  }
}
