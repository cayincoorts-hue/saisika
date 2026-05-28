import ReactECharts from 'echarts-for-react';
import ChartStateBlock from './ChartStateBlock';

interface Props {
  data: any;
}

export default function RiskTrendChart({ data }: Props) {
  if (!data || data.status !== 'ok') {
    return <ChartStateBlock status={data?.status || 'unavailable'} missingReason={data?.missing_reason}><div /></ChartStateBlock>;
  }

  const option = {
    animation: true,
    animationDuration: 1600,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(250,249,245,0.96)',
      borderColor: '#e6dfd8',
      textStyle: { color: '#252523' },
    },
    legend: { data: data.series?.map((s: any) => s.name) || [] },
    xAxis: { type: 'category', data: data.x || [], axisLabel: { rotate: 30, fontSize: 11, margin: 14 } },
    yAxis: { type: 'value', name: '风险评分', nameTextStyle: { fontSize: 11 } },
    series: (data.series || []).map((s: any, i: number) => ({
      name: s.name, type: 'line', data: s.data,
      smooth: true,
      symbol: 'circle',
      symbolSize: 0,
      animationDuration: 1600,
      animationDelay: i * 180,
      lineStyle: { width: 2.5, shadowBlur: 8, shadowColor: 'rgba(20,20,19,0.10)' },
      emphasis: {
        focus: 'series',
        scale: true,
        lineStyle: { width: 3.5 },
      },
    })),
    grid: { left: 60, right: 20, top: 40, bottom: 90 },
  };

  return (
    <ChartStateBlock status="ok">
      <div className="chart-surface">
        <ReactECharts option={option} style={{ height: 300 }} opts={{ renderer: 'canvas' }} />
      </div>
    </ChartStateBlock>
  );
}
