// 跨模块共用的类型，不属于任何一个业务模块。每个模块的interface.ts需要用到
// 这类"谁都可能用得上"的类型时，从这里导入，不要互相借用彼此的interface.ts。

export interface DbError {
  message: string;
  code?: string;
}
