import { ProHistoryClientPage } from "@/app/pro/history/history-client-page"
import type { AsyncViewState } from "@/lib/pro-types"

const historyStateOptions: AsyncViewState[] = ["success", "loading", "empty", "error"]

type RawSearchParams = Record<string, string | string[] | undefined>

type HistoryPageProps = {
  searchParams?: Promise<RawSearchParams>
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function getHistoryState(value: string | undefined): AsyncViewState {
  return historyStateOptions.includes(value as AsyncViewState) ? (value as AsyncViewState) : "success"
}

export default async function ProHistoryPage({ searchParams }: HistoryPageProps) {
  const resolvedParams = (await searchParams) ?? {}
  const historyState = getHistoryState(firstValue(resolvedParams.state))

  return <ProHistoryClientPage historyState={historyState} />
}
