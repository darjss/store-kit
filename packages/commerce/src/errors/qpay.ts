export type QPayError =
  | { _tag: 'QPayRequestFailed'; message: string }
  | { _tag: 'QPayResponseInvalid'; message: string }

export const qpayError = (tag: QPayError['_tag']) =>
  ({
    _tag: tag,
    message: 'QPay төлбөрийг одоогоор бэлтгэх боломжгүй байна.',
  }) satisfies QPayError
