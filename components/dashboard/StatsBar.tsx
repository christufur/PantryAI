type Stat = {
  value: string;
  label: string;
  color: string;
};

type Props = {
  stats: Stat[];
};

export default function StatsBar({ stats }: Props) {
  return (
    <div className="grid grid-cols-4 border-b border-gray-100 bg-white">
      {stats.map((stat, i) => (
        <div
          key={i}
          className={`px-[18px] py-[14px] ${i < stats.length - 1 ? "border-r border-gray-100" : ""}`}
        >
          <div className={`text-[22px] font-medium ${stat.color}`}>{stat.value}</div>
          <div className="text-[11px] uppercase tracking-widest text-gray-400 mt-0.5">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
