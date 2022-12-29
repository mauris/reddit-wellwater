import {
  createColumnHelper,
  useReactTable,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  ColumnDef,
} from '@tanstack/react-table';
import { useRef, useState } from 'react';
import { fetchRedditThreads } from './actions/fetchRedditThreads';
import './App.css';

function Loader() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32px"
      height="32px"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid"
    >
      <circle
        cx="50"
        cy="50"
        r="30"
        stroke="#bbcedd"
        stroke-width="10"
        fill="none"
      ></circle>
      <circle
        cx="50"
        cy="50"
        r="30"
        stroke="#85a2b6"
        stroke-width="8"
        stroke-linecap="round"
        fill="none"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          repeatCount="indefinite"
          dur="1s"
          values="0 50 50;180 50 50;720 50 50"
          keyTimes="0;0.5;1"
        ></animateTransform>
        <animate
          attributeName="stroke-dasharray"
          repeatCount="indefinite"
          dur="1s"
          values="18.84955592153876 169.64600329384882;94.2477796076938 94.24777960769377;18.84955592153876 169.64600329384882"
          keyTimes="0;0.5;1"
        ></animate>
      </circle>
    </svg>
  );
}

function downloadBlob(content: string, filename: string, contentType: string) {
  // Create a blob
  var blob = new Blob([content], { type: contentType });
  var url = URL.createObjectURL(blob);

  // Create a link to download it
  var pom = document.createElement('a');
  pom.href = url;
  pom.setAttribute('download', filename);
  pom.click();
}

function SubredditSelector({
  disabled,
  onChange,
}: {
  disabled?: boolean;
  onChange?: (subreddit: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOnChange = () => {
    if (disabled || !onChange || !inputRef.current) {
      return;
    }

    const inputValue = inputRef.current.value;
    const urlRegex =
      /^https:\/\/(www\.|m\.){0,1}reddit\.com\/r\/([a-z0-9A-Z]+)\/{0,1}/;
    if (urlRegex.test(inputValue)) {
      const matches = inputValue.match(urlRegex);
      if (matches === null) {
        return;
      }
      onChange(matches[2]);
      return;
    }
    onChange(inputValue);
  };

  return (
    <>
      <input
        disabled={disabled}
        ref={inputRef}
        type="text"
        onKeyDown={(e) => {
          if (e.code === 'Enter') {
            e.preventDefault();
            handleOnChange();
          }
        }}
        placeholder="Subreddit"
      />
      <button disabled={disabled} onClick={handleOnChange}>
        Start
      </button>
    </>
  );
}

interface Thread {
  authorName: string;
  authorId: string;
  title: string;
  body: string;
  upvotes: number;
  upvoteRatio: number;
  permalink: string;
}

const columnHelper = createColumnHelper<Thread>();

const columns: ColumnDef<Thread, any>[] = [
  columnHelper.accessor('authorName', {
    header: () => <span>Author</span>,
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('title', {
    id: 'title',
    cell: (info) => (
      <a
        target="_blank"
        rel="noreferrer"
        href={`https://reddit.com${info.row.original.permalink}`}
      >
        {info.getValue()}
      </a>
    ),
    header: () => <span>Title</span>,
  }),
  columnHelper.accessor('upvotes', {
    header: () => 'Upvotes',
    cell: (info) => info.renderValue(),
  }),
];

function convertToString(keys: (keyof Thread)[], thread: Thread) {
  return keys
    .map((key) => String(thread[key]).replaceAll('"', '""'))
    .map((value) => `"${value}"`)
    .join(';');
}

function Table({
  data,
  columns,
}: {
  data: Thread[];
  columns: ColumnDef<Thread>[];
}) {
  const table = useReactTable({
    data,
    columns,
    // Pipeline
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
  });

  return (
    <>
      <div className="threads-table-content">
        <table className="threads-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <th key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder ? null : (
                        <div>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              return (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    return (
                      <td key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="table-footer flex items-center gap-2">
        <button
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
        >
          {'<<'}
        </button>
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {'<'}
        </button>
        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          {'>'}
        </button>
        <button
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
        >
          {'>>'}
        </button>
        <span className="flex items-center gap-1">
          <div>Page</div>
          <strong>
            {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </strong>
        </span>
        <span className="flex items-center gap-1">
          | Go to page:
          <input
            type="number"
            min={table.getPageCount() > 0 ? 1 : 0}
            max={table.getPageCount()}
            defaultValue={table.getState().pagination.pageIndex + 1}
            onChange={(e) => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0;
              table.setPageIndex(page);
            }}
            className="border p-1 rounded w-16 text-center"
          />
        </span>
        <select
          value={table.getState().pagination.pageSize}
          onChange={(e) => {
            table.setPageSize(Number(e.target.value));
          }}
        >
          {[10, 20, 30, 40, 50].map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

function App() {
  const [isDownloading, setDownloading] = useState<boolean>(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const controller = useRef<AbortController | null>(null);

  const performCollection = async (
    controller: AbortController,
    threadsSoFar: Thread[],
    subreddit: string,
    after: string | null = null
  ) => {
    if (controller.signal.aborted) {
      return;
    }
    let newThreadsSoFar: Thread[] = [];
    let newNextAfter = '';
    try {
      const response = await fetchRedditThreads(controller, subreddit, after);
      const { children, after: nextAfter } = response.data;
      newNextAfter = nextAfter;
      newThreadsSoFar = [
        ...threadsSoFar,
        ...children.map(({ data }: { data: any }) => ({
          authorName: data.author,
          authorId: data.author_fullname,
          title: data.title,
          body: data.selftext,
          upvotes: data.ups,
          upvoteRatio: data.upvote_ratio,
          permalink: data.permalink,
        })),
      ];
    } catch (e) {
      alert(`An error occurred while downloading more data.\n${e}`);
      setDownloading(false);
      return;
    }

    setThreads(newThreadsSoFar);

    setTimeout(() => {
      if (controller.signal.aborted) {
        return;
      }
      performCollection(controller, newThreadsSoFar, subreddit, newNextAfter);
    }, 5000);
  };

  const threadKeys: (keyof Thread)[] =
    threads.length > 0 ? (Object.keys(threads[0]) as (keyof Thread)[]) : [];

  return (
    <div className="App">
      <div className="top-controls">
        <SubredditSelector
          disabled={isDownloading}
          onChange={(subreddit) => {
            controller.current?.abort();
            setThreads([]);
            controller.current = new AbortController();
            controller.current.signal.addEventListener('abort', () => {
              setDownloading(false);
            });
            setDownloading(true);
            performCollection(controller.current, [], subreddit);
          }}
        />
        <button
          disabled={!isDownloading}
          onClick={() => {
            controller.current?.abort();
          }}
        >
          Stop
        </button>
        <button
          disabled={isDownloading}
          onClick={() => {
            const rows = threads.map((value) =>
              convertToString(threadKeys, value)
            );
            const header = threadKeys.map((k) => `"${k}"`).join(';');
            const csvFileContent = `${header}\n${rows.join('\n')}\n`;
            downloadBlob(csvFileContent, 'threads.csv', 'text/csv');
          }}
        >
          Download CSV File
        </button>
        {isDownloading ? <Loader /> : null}
        <div className="flex-1"></div>
        <div>{`${threads.length} threads fetched`}</div>
      </div>
      <Table data={threads} columns={columns} />
    </div>
  );
}

export default App;
