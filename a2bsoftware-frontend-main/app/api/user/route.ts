import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Retrieve the first administrator user from the database to establish session authority
    const adminRole = await prisma.role.findFirst({ where: { name: "Admin" } });
    const user = adminRole
      ? await prisma.user.findFirst({ where: { role_id: adminRole.id } })
      : null;

    if (user) {
      // Query the database client_user_priv to retrieve active module permissions for this role
      const priv = await prisma.clientUserPriv.findFirst({
        where: { user_type_id: user.role_id }
      });

      const activeIds = priv && priv.access_right_id
        ? priv.access_right_id.split(",").map((id) => parseInt(id.trim())).filter((id) => !isNaN(id))
        : [];

      return NextResponse.json({
        ...user,
        role: adminRole?.name,
        permissions: activeIds
      });
    }
  } catch (err) {
    console.error("Error fetching user session from database", err);
  }

  return NextResponse.json({ error: "No administrator profile found in database" }, { status: 404 });
}
