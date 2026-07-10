import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([
    { user_id: "demo-1",  display_name: "Marcus W.",        avatar: null, is_owner: true  },
    { user_id: "demo-2",  display_name: "Your Team",        avatar: null, is_owner: false },
    { user_id: "demo-3",  display_name: "Tyler R.",         avatar: null, is_owner: false },
    { user_id: "demo-4",  display_name: "Jordan P.",        avatar: null, is_owner: false },
    { user_id: "demo-5",  display_name: "Alex C.",          avatar: null, is_owner: false },
    { user_id: "demo-6",  display_name: "Ryan M.",          avatar: null, is_owner: false },
    { user_id: "demo-7",  display_name: "Chris B.",         avatar: null, is_owner: false },
    { user_id: "demo-8",  display_name: "Sam T.",           avatar: null, is_owner: false },
    { user_id: "demo-9",  display_name: "Mike F.",          avatar: null, is_owner: false },
    { user_id: "demo-10", display_name: "Big Play Kevin",   avatar: null, is_owner: false },
  ]);
}
