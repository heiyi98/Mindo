// 唯我独尊 —— 静态标记
//
// 跟 ValveLogo.tsx 用的是同一套原始几何坐标，但不含动画需要的轨道延伸
// (那种 "L 512 24000" 的部分)，专供图标/水印等纯静态场景使用。
// 如果哪天 logo 的几何形状要改，这里和 ValveLogo.tsx 里的 PATHS 常量
// 要一起同步修改——两边目前是独立维护的两份坐标。

export const MINDO_MARK_PATH_LEFT =
  'M 264.786404500042 826.460551068478 A 400 400 0 0 1 512 112 L 512 317.652678442978 A 152.786404500042 152.786404500042 0 0 1 453.640786499874 437.774425937465 A 94.4271909999159 94.4271909999159 0 0 0 453.640786499874 586.225574062535';
export const MINDO_MARK_PATH_RIGHT =
  'M 759.213595499958 197.539448931522 A 400 400 0 0 1 512 912 L 512 706.347321557022 A 152.786404500042 152.786404500042 0 0 1 570.359213500126 586.225574062535 A 94.4271909999159 94.4271909999159 0 0 0 570.359213500126 437.774425937465';

interface MindoMarkProps {
  /** 显示尺寸(px)，默认32——跟原本Dock.tsx里手写版本一致 */
  size?: number;
  /** 描边颜色，默认跟随文字颜色(currentColor) */
  color?: string;
  /** 描边粗细，1024 viewBox 基准单位。52 是针对 32px 尺寸调过的值，
      如果显示尺寸差异很大（比如要用在更大的地方），这个值大概率需要重新调，
      道理跟当初调 favicon 一样：小尺寸需要不成比例地加粗才能看清 */
  strokeWidth?: number;
  className?: string;
}

export function MindoMark({
  size = 32,
  color = 'currentColor',
  strokeWidth = 52,
  className,
}: MindoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Mindo"
      className={className}
    >
      <g
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeMiterlimit={10}
      >
        <path d={MINDO_MARK_PATH_LEFT} />
        <path d={MINDO_MARK_PATH_RIGHT} />
      </g>
    </svg>
  );
}
