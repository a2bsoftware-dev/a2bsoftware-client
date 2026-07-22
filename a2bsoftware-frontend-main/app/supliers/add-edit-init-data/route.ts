import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bufferToUuid } from "@/lib/uuid-binary";

export async function POST() {
  try {
    const vendorRows = await prisma.vendor.findMany({
      select: {
        id: true,
        vendorName: true,
      }
    });
    const vendors = vendorRows.map((v) => ({ id: bufferToUuid(v.id), vendorName: v.vendorName }));

    const statusOptions = [
      { value: "1", label: "Bidding" },
      { value: "2", label: "Testing" },
      { value: "3", label: "Running" },
      { value: "4", label: "Hold" },
      { value: "5", label: "Completed" },
      { value: "6", label: "Awaiting-Ids" },
      { value: "7", label: "Closed" }
    ];

    const dataToAskOnRedirect = [
      { value: "1", label: "Email" },
      { value: "2", label: "Zip" },
      { value: "3", label: "Age" },
      { value: "4", label: "Gender" }
    ];

    return NextResponse.json({
      success: true,
      vendors,
      statusOptions,
      dataToAskOnRedirect
    });
  } catch (err: any) {
    console.error("Error loading supplier form metadata", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Failed to load supplier form options"
    }, { status: 500 });
  }
}
