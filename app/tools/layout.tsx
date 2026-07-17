import ToolVisitTracker from "@/components/ToolVisitTracker";

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ToolVisitTracker />
      {children}
    </>
  );
}
