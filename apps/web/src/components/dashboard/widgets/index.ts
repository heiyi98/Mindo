export { default as ProfileCardWidget }  from './ProfileCardWidget';
export { default as BaziChartWidget }    from './BaziChartWidget';
export { default as WuxingRadarWidget }  from './WuxingRadarWidget';
export { default as DayMasterWidget }    from './DayMasterWidget';
export { default as BigFiveRadarWidget } from './BigFiveRadarWidget';
export { default as WesternChartWidget } from './WesternChartWidget';

export interface WidgetProps {
  profileId: string;
  isEditMode: boolean;
  dashboardData?: Record<string, unknown>;
}
