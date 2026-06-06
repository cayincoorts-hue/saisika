import ReactECharts from 'echarts-for-react';
import { useTranslation } from 'react-i18next';
import ChartStateBlock from './ChartStateBlock';

interface Props {
  data: any;
}

export default function RiskDistributionChart({ data }: Props) {
  const { t } = useTranslation();
  if (!data || data.status !== 'ok') {
    return <ChartStateBlock status={data?.status || 'unavailable'} missingReason={data?.missing_reason}><div /></ChartStateBlock>;
  }

  const categories = data.bar?.categories || [];
  const values = data.bar?.values || [];
  const colors = data.bar?.colors || ['#c64545', '#e8a55a', '#5db872'];
  const donutData = data.donut?.data || [];

  const barOption = {
    animation: true,
    animationDuration: 1500,
    animationEasing: 'cubicOut',
    animationDelay: (idx: number) => idx * 160,
    tooltip: {
      backgroundColor: 'rgba(250,249,245,0.96)',
      borderColor: '#e6dfd8',
      textStyle: { color: '#252523' },
    },
    xAxis: { type: 'category', data: categories },
    yAxis: { type: 'value', name: t('riskDistribution.nodeCount') },
    series: [{
      type: 'bar', data: values.map((v: number, i: number) => ({
        value: v,
        itemStyle: {
          color: colors[i],
          borderRadius: [6, 6, 0, 0],
          shadowColor: `${colors[i]}33`,
          shadowBlur: 10,
        },
      })),
      barWidth: '42%',
      showBackground: true,
      backgroundStyle: { color: 'rgba(230,223,216,0.28)', borderRadius: [6, 6, 0, 0] },
      emphasis: {
        focus: 'series',
        itemStyle: {
          shadowBlur: 18,
          shadowColor: 'rgba(20,20,19,0.18)',
        },
      },
    }],
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
  };

  const donutOption = {
    animation: true,
    animationType: 'expansion',
    animationDuration: 1450,
    animationDelay: 560,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(250,249,245,0.96)',
      borderColor: '#e6dfd8',
      textStyle: { color: '#252523' },
    },
    series: [{
      type: 'pie', radius: ['50%', '75%'], center: ['50%', '55%'],
      data: donutData.map((d: any) => ({
        name: d.name, value: d.value,
        itemStyle: {
          color: d.name === '高风险' ? '#c64545' : d.name === '中风险' ? '#e8a55a' : '#5db872'
        }
      })),
      label: { formatter: '{b}\n{d}%' },
      emphasis: {
        scale: true,
        scaleSize: 8,
        itemStyle: {
          shadowBlur: 16,
          shadowColor: 'rgba(20,20,19,0.16)',
        },
      },
    }],
  };

  return (
    <ChartStateBlock status="ok">
      <div className="grid-2">
        <div className="chart-surface">
          <ReactECharts option={barOption} style={{ height: 220 }} opts={{ renderer: 'canvas' }} />
        </div>
        <div className="chart-surface">
          <ReactECharts option={donutOption} style={{ height: 220 }} opts={{ renderer: 'canvas' }} />
        </div>
      </div>
    </ChartStateBlock>
  );
}
