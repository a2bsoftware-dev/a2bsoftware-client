import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uuidToBuffer, bufferToUuid } from "@/lib/uuid-binary";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const status = body.status;

    let pidBuf: Uint8Array<ArrayBuffer>;
    let gidBuf: Uint8Array<ArrayBuffer>;
    try {
      pidBuf = uuidToBuffer(String(body.pid || ""));
      gidBuf = uuidToBuffer(String(body.gid || ""));
    } catch {
      return NextResponse.json({ success: false, error: "Invalid parameters" }, { status: 400 });
    }

    let whereClause = "s.pid = ? AND s.gid = ?";
    const params: any[] = [pidBuf, gidBuf];

    if (status !== undefined && status !== null && status !== "") {
      whereClause += " AND s.status = ?";
      params.push(parseInt(status));
    }

    const dataSql = `
      SELECT s.*, p.project_name, v.vendorName, c.clientName, co.name as country_name
      FROM start_survey_informations s
      LEFT JOIN projects p ON p.id = s.pid
      LEFT JOIN manage_suppliers ms ON ms.id = s.gid
      LEFT JOIN vendors v ON v.id = ms.vendor_id
      LEFT JOIN clients c ON c.id = p.client_id
      LEFT JOIN countries co ON co.id = p.country_id
      WHERE ${whereClause}
      ORDER BY s.id DESC
    `;

    const surveyInformations = await prisma.$queryRawUnsafe<any[]>(dataSql, ...params);

    const statusOptions: Record<number, string> = {
      0: "Drop",
      1: "Complete",
      2: "Disqualify",
      3: "quotaFull",
      4: "securityTerm",
    };

    const formattedData = surveyInformations.map((row) => {
      const formatDate = (dateVal: any) => {
        if (!dateVal) return "";
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return "";
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
      };

      const formatTime = (dateVal: any) => {
        if (!dateVal) return "";
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return "";
        const h = String(d.getHours()).padStart(2, "0");
        const m = String(d.getMinutes()).padStart(2, "0");
        const s = String(d.getSeconds()).padStart(2, "0");
        return `${h}:${m}:${s}`;
      };

      return {
        id: bufferToUuid(row.id),
        pid: bufferToUuid(row.pid),
        gid: bufferToUuid(row.gid),
        vendorName: row.vendorName || "Internal Team",
        project_name: row.project_name || "",
        clientName: row.clientName || "",
        start_ip_address: row.start_ip_address,
        end_ip_address: row.end_ip_address || row.start_ip_address,
        start_time: formatTime(row.start_time),
        end_time: formatTime(row.end_time),
        start_date: formatDate(row.start_time),
        end_date: formatDate(row.end_time),
        ref_id: row.ref_id,
        user_id: row.user_id,
        status: statusOptions[row.status] || "Drop",
        country_name: row.country_name || "",
      };
    });

    return NextResponse.json({
      success: true,
      suplierSurveyDetails: formattedData
    });

  } catch (err: any) {
    console.error("Error loading supplier survey details", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Failed to load details"
    }, { status: 500 });
  }
}
