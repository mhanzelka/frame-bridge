import { codeToHtml } from "shiki";

type CodeBlockProps = {
    code: string;
    lang?: string;
    filename?: string;
};

export const CodeBlock = async ({ code, lang = "ts", filename }: CodeBlockProps) => {
    const html = await codeToHtml(code.trim(), {
        lang,
        theme: "github-dark-default",
    });

    return (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
            {filename && (
                <div className="border-b border-zinc-800 bg-zinc-900 px-4 py-2 text-xs text-zinc-500">
                    {filename}
                </div>
            )}
            <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
    );
};
