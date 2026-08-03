export const tableRowId = (tableId: string, rowId: string) => `${tableId}-row-${rowId}`

export const activeTableRowId = (
  tableId: string,
  rowIds: string[],
  activeIndex: number | undefined,
) => {
  if (activeIndex === undefined) return undefined
  const rowId = rowIds[Math.min(activeIndex, rowIds.length - 1)]
  return rowId ? tableRowId(tableId, rowId) : undefined
}

export const handleTableNavigation = (
  event: KeyboardEvent & { currentTarget: HTMLDivElement; target: Element },
  rowIds: string[],
  activeIndex: number | undefined,
  setActiveIndex: (index: number) => void,
  openRow: (rowId: string) => void,
) => {
  if (event.target !== event.currentTarget || rowIds.length === 0) return

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    const nextIndex =
      activeIndex === undefined
        ? event.key === 'ArrowDown'
          ? 0
          : rowIds.length - 1
        : activeIndex + (event.key === 'ArrowDown' ? 1 : -1)
    setActiveIndex(Math.min(rowIds.length - 1, Math.max(0, nextIndex)))
    return
  }

  if (event.key === 'Enter' && activeIndex !== undefined) {
    event.preventDefault()
    const rowId = rowIds[Math.min(activeIndex, rowIds.length - 1)]
    if (rowId) openRow(rowId)
  }
}
