export type TelegramError =
  | { _tag: 'TelegramRequestFailed'; message: string }
  | { _tag: 'TelegramResponseInvalid'; message: string }

export const telegramRequestError = () =>
  ({
    _tag: 'TelegramRequestFailed',
    message: 'Ажилтанд мэдэгдэл илгээж чадсангүй.',
  }) satisfies TelegramError

export const telegramResponseError = () =>
  ({
    _tag: 'TelegramResponseInvalid',
    message: 'Ажилтанд мэдэгдэл илгээж чадсангүй.',
  }) satisfies TelegramError
