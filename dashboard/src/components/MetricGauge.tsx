interface MetricGaugeProps {
  value: number;
  label: string;
}

export function MetricGauge({ value, label }: MetricGaugeProps) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  
  let color = 'stroke-green-500';
  if (value > 80) color = 'stroke-red-500';
  else if (value > 60) color = 'stroke-yellow-500';

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="relative h-16 w-16">
        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 50 50">
          <circle
            className="stroke-muted"
            strokeWidth="4"
            fill="transparent"
            r={radius}
            cx="25"
            cy="25"
          />
          <circle
            className={`${color} transition-all duration-500 ease-in-out`}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            r={radius}
            cx="25"
            cy="25"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold">{Math.round(value)}%</span>
        </div>
      </div>
      <span className="mt-1 text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
