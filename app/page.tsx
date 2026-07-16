import { auth } from "@clerk/nextjs/server";
import Guest from "../components/Guest";
import HomeDashboard from "../components/HomeDashboard";

// Server component: signed-out visitors get the static Guest page rendered
// on the server (instant first paint, no Clerk client init required);
// signed-in users get the client dashboard.
export default async function HomePage() {
  const { userId } = await auth();

  if (!userId) {
    return <Guest />;
  }

  return <HomeDashboard />;
}
