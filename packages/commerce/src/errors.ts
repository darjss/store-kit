export type QPayError =
  | { _tag: 'QPayRequestFailed'; message: string }
  | { _tag: 'QPayResponseInvalid'; message: string }

export type TelegramError =
  | { _tag: 'TelegramRequestFailed'; message: string }
  | { _tag: 'TelegramResponseInvalid'; message: string }

export const qpayError = (tag: QPayError['_tag']) =>
  ({
    _tag: tag,
    message: 'QPay төлбөрийг одоогоор бэлтгэх боломжгүй байна.',
  }) satisfies QPayError

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
