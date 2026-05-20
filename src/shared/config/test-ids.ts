export enum LoginTestId {
  USERNAME_INPUT = 'login-username-input',
  PASSWORD_INPUT = 'login-password-input',
  SUBMIT_BUTTON = 'login-submit-button'
}

export enum WithdrawFormTestId {
  AMOUNT_INPUT = 'withdraw-amount-input',
  DESTINATION_INPUT = 'withdraw-destination-input',
  CONFIRM_CHECKBOX = 'withdraw-confirm-checkbox',
  SUBMIT_BUTTON = 'withdraw-submit-button',
  ERROR_BANNER = 'withdraw-error-banner',
  ERROR_RETRY_BUTTON = 'withdraw-error-retry-button',
  SUCCESS_BANNER = 'withdraw-success-banner',
  SUCCESS_LINK = 'withdraw-success-link'
}

export enum WithdrawFeedTestId {
  REGION = 'withdraw-feed-region',
  DIALOG = 'withdraw-feed-dialog',
  DIALOG_CANCEL = 'withdraw-feed-dialog-cancel',
  DIALOG_DELETE = 'withdraw-feed-dialog-delete',
  INITIAL_SKELETON = 'withdraw-feed-initial-skeleton',
  LOAD_MORE_SKELETON = 'withdraw-feed-load-more-skeleton'
}

export enum ThemeTestId {
  SELECT = 'theme-select'
}

export enum LanguageTestId {
  SELECT = 'language-select'
}

export enum HeaderTestId {
  BRAND = 'header-brand',
  ROOT = 'header-root'
}

export enum FooterTestId {
  ROOT = 'footer-root'
}

export enum ShellTestId {
  CONTENT = 'shell-content',
  NAVIGATION_PROGRESS = 'shell-navigation-progress'
}

export enum HomePageTestId {
  TITLE = 'home-page-title'
}

export enum WithdrawDetailsTestId {
  ID = 'withdraw-details-id',
  STATUS = 'withdraw-details-status',
  AMOUNT = 'withdraw-details-amount',
  NETWORK = 'withdraw-details-network',
  CHAT = 'withdraw-details-chat',
  NOT_FOUND = 'withdraw-details-not-found'
}

export enum WithdrawTicketChatTestId {
  ROOT = 'withdraw-ticket-chat-root',
  LOADING = 'withdraw-ticket-chat-loading',
  ERROR = 'withdraw-ticket-chat-error',
  EMPTY = 'withdraw-ticket-chat-empty',
  LIST = 'withdraw-ticket-chat-list',
  INPUT = 'withdraw-ticket-chat-input',
  SEND_BUTTON = 'withdraw-ticket-chat-send-button'
}

export function getWithdrawFeedItemTestId(id: string): string {
  return `withdraw-feed-item-${id}`;
}

export function getWithdrawFeedDeleteButtonTestId(id: string): string {
  return `withdraw-feed-delete-${id}`;
}
