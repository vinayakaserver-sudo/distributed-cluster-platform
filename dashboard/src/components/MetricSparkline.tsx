import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

interface MetricSparklineProps {
  data: { timestamp: string; value: number }[];
  color: string;
  label: string;
}

export function MetricSparkline({ data, color, label }: MetricSparklineProps) {
  if (!data || data.length === 0) return <div className="h-24 w-full bg-muted/20 animate-pulse rounded" />;

  return (
    <div className="flex flex-col space-y-1">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="h-24 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Tooltip 
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              labelStyle={{ display: 'none' }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              strokeWidth={2} 
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
