type Row = {
    name: string;
    type: string;
    default?: string;
    description: string;
};

type ApiTableProps = {
    rows: Row[];
};

export const ApiTable = ({ rows }: ApiTableProps) => (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
            <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900">
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Prop / Method</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Default</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Description</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((row, i) => (
                    <tr key={i} className="border-b border-zinc-800/50 last:border-0">
                        <td className="px-4 py-3 font-mono text-blue-400">{row.name}</td>
                        <td className="px-4 py-3 font-mono text-zinc-300 text-xs">{row.type}</td>
                        <td className="px-4 py-3 font-mono text-zinc-500 text-xs">{row.default ?? "—"}</td>
                        <td className="px-4 py-3 text-zinc-400">{row.description}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);
