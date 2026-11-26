/**
 * Lớp CSS dùng chung cho responsive.
 * Điện thoại (< 640px): hộp thoại phủ toàn màn hình, nút chính dính đáy.
 */
export const DIALOG_MOBILE_FULL =
  "max-sm:inset-0 max-sm:top-0 max-sm:left-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-none max-sm:rounded-none max-sm:pb-0 max-sm:content-start [&_[data-slot=dialog-title]]:pr-10";

/** Bọc nút Lưu/Xác nhận: dính đáy trên điện thoại để bàn phím không che */
export const STICKY_ACTIONS =
  "sticky bottom-0 z-10 -mx-6 mt-2 border-t bg-popover px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:mt-0 sm:border-0 sm:bg-transparent sm:p-0";

/** Hàng nút lọc / tab: cuộn ngang trên điện thoại, không cắt chữ */
export const SCROLL_ROW = "-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [scrollbar-width:none]";
