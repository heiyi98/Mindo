'use client';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 数据"多久内算新鲜、不需要重新请求"的默认值——给一个不算激进的
        // 数字（1分钟），避免默认设置下，用户稍微切一下页面就触发大量
        // 没必要的重新请求。具体到某一类数据要不要更敏感/更迟钝，以后
        // 写具体功能的时候可以针对那一处单独覆盖这个默认值，不需要改这里。
        staleTime: 60 * 1000,
      },
    },
  });
}

// 服务器端渲染这一端，每次请求都必须新建一个，不能复用同一个——不同用户
// 的请求如果共用同一个QueryClient，缓存的数据会在不同用户之间串台。
// 浏览器这一端，整个网页生命周期内只建一次、之后一直复用同一个，这样才能
// 真正发挥"记住已经问过的数据、避免重复请求"这个作用。
let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(getQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
