// 报告生成中，还没到手的主题用这个占位。纯灰色矩形块+横向光泽扫过，
// 不需要文案（不走next-intl），颜色引用hsl(var(--muted))系变量跟随明暗主题，
// shimmer动画定义在globals.css的.skeleton-shimmer里。

function Bar({ width, height = 14 }: { width: string; height?: number }) {
  return <div className="skeleton-shimmer rounded" style={{ width, height }} />
}

const LINE_WIDTHS = ['100%', '94%', '88%', '70%', '96%', '60%']

export function ReadingSkeletonParagraph({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <Bar key={i} width={LINE_WIDTHS[i % LINE_WIDTHS.length]} />
      ))}
    </div>
  )
}

// Theme1标题旁边有个圆形命盘小图，body是单段正文
export function Theme1Skeleton() {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <ReadingSkeletonParagraph lines={4} />
      </div>
      <div className="skeleton-shimmer rounded-full flex-shrink-0" style={{ width: 64, height: 64 }} />
    </div>
  )
}

// Theme2/3 body是几个并列的子条目（十神机制/场景），各占一段
export function MultiBlockSkeleton({ blocks = 3 }: { blocks?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: blocks }).map((_, i) => (
        <div key={i}>
          <Bar width="90px" height={18} />
          <div className="mt-3">
            <ReadingSkeletonParagraph lines={3} />
          </div>
        </div>
      ))}
    </div>
  )
}

// Theme4 body是核心矛盾+自洽建议两段
export function Theme4Skeleton() {
  return (
    <div className="space-y-6">
      <ReadingSkeletonParagraph lines={2} />
      <ReadingSkeletonParagraph lines={3} />
    </div>
  )
}
