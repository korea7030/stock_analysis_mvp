import Link from "next/link";

type Section = {
  title: string;
  body: string[];
};

export function LegalPage(props: {
  title: string;
  updated: string;
  intro: string;
  sections: Section[];
}) {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
          Back to dashboard
        </Link>
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Last updated: {props.updated}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {props.title}
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">{props.intro}</p>
          <div className="mt-8 space-y-7">
            {props.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
                <div className="mt-2 space-y-3">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-6 text-slate-600">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
