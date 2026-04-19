"use client";

type Props = {
  day: string;
  date: number;
  meals: string[];
  isToday?: boolean;
  onClick?: () => void;
};

export default function DayCell({ day, date, meals, isToday, onClick }: Props) {
  const isEmpty = meals.length === 0;

  return (
    <div
      onClick={onClick}
      className={`rounded-md border min-h-[90px] p-2 cursor-pointer transition-colors
        ${isToday ? "border-gray-800" : "border-gray-200 hover:border-gray-400"}
        ${isEmpty ? "bg-gray-50" : "bg-white"}
      `}
    >
      <div className="text-[10px] uppercase tracking-widest text-gray-400">{day}</div>
      <div className="text-[12px] font-medium text-gray-700 mb-1.5">{date}</div>

      {isEmpty ? (
        <div className="text-[10px] text-gray-400">＋ plan day</div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {meals.map((meal, i) => (
            <div
              key={i}
              className="text-[10px] bg-gray-100 rounded px-1.5 py-0.5 text-gray-600 leading-tight"
            >
              {meal}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
