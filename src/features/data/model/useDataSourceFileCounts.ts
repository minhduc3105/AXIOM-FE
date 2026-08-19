import { useEffect, useMemo, useState } from "react";
import { getDataSourceFileCount } from "../api/dataApi";
import type { DataSource } from "./types";

export type DataSourceFileCountState = {
  count: number | null;
  loading: boolean;
  error: boolean;
};

export function useDataSourceFileCounts(datasources: DataSource[]) {
  const datasourceKey = useMemo(
    () => datasources.map((datasource) => datasource.id).sort().join(","),
    [datasources],
  );
  const [counts, setCounts] = useState<
    Record<string, DataSourceFileCountState>
  >({});

  useEffect(() => {
    const controller = new AbortController();
    if (datasources.length === 0) {
      setCounts({});
      return () => controller.abort();
    }

    setCounts(
      Object.fromEntries(
        datasources.map((datasource) => [
          datasource.id,
          { count: null, loading: true, error: false },
        ]),
      ),
    );

    void Promise.allSettled(
      datasources.map(async (datasource) => ({
        id: datasource.id,
        count: await getDataSourceFileCount(datasource.id, controller.signal),
      })),
    ).then((results) => {
      if (controller.signal.aborted) return;
      setCounts(
        Object.fromEntries(
          results.map((result, index) => {
            const id = datasources[index].id;
            return result.status === "fulfilled"
              ? [
                  id,
                  {
                    count: result.value.count,
                    loading: false,
                    error: false,
                  },
                ]
              : [id, { count: null, loading: false, error: true }];
          }),
        ),
      );
    });

    return () => controller.abort();
  }, [datasourceKey, datasources]);

  return counts;
}
