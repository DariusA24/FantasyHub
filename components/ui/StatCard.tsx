export default function StatCard({
  icon,
  label,
  value,
  className,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div
      className="  flex flex-col justify-between 
  w-full 
  rounded-2xl 
  bg-[#0f1117] 
  border border-[#1d212b] 
  p-6 
  shadow-[0_0_20px_rgba(0,0,0,0.3)] 
  hover:shadow-[0_0_25px_rgba(244,208,111,0.15)] 
  transition-shadow duration-300
"
    >
      <div className="flex items-center gap-2 text-gray-300">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="mt-3 text-4xl font-semibold text-[#F4D06F]">{value}</div>
    </div>
  );
}
