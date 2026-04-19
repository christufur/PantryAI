import DayCell from "./DayCell";

const WEEK = [
  {
    day: "MON", date: 12,
    meals: ["Oatmeal + blueberries", "Grilled chicken salad", "Salmon + sweet potato"],
  },
  {
    day: "TUE", date: 13,
    meals: ["Greek yogurt + walnuts", "Turkey avocado wrap", "Beef stir-fry + rice"],
  },
  {
    day: "WED", date: 14,
    meals: ["Scrambled eggs + toast", "Lentil soup + salad", "Baked cod + veg"],
  },
  { day: "THU", date: 15, meals: [] },
  { day: "FRI", date: 16, meals: [] },
  { day: "SAT", date: 17, meals: [] },
  { day: "SUN", date: 18, meals: [], isToday: true },
];

export default function WeeklyCalendar() {
  const now = new Date();
  const monthRange = `${now.toLocaleDateString("en-US", { month: "short" })} 12 – 18`;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] uppercase tracking-widest text-gray-400">This week</p>
        <p className="text-[11px] text-gray-400">{monthRange}</p>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEK.map((d, i) => (
          <DayCell
            key={i}
            day={d.day}
            date={d.date}
            meals={d.meals}
            isToday={d.isToday}
          />
        ))}
      </div>
    </div>
  );
}
