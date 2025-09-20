This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Clinician Workspace (patient card redesign)

Navigate to `/clinician` to try the clinician tools with a patient-centric UI:

- Patient card: Enter optional Name, Age, and Patient ID.
- System & Codes: Choose Ayurveda/Siddha/Unani, enter a NAMASTE code, or provide an ICD Name.
- Actions:
	- Search: Runs public lookup across verified mappings.
	- Translate Code: NAMASTE → ICD-11 and TM2; builds a FHIR Condition preview.
	- Translate by ICD Name: Enrich details by ICD name when diagnosis is known.
- FHIR Tools: Quick buttons for `/metadata`, `CodeSystem/{system}`, `$lookup`, `$expand`, `$translate`.
- FHIR Condition (preview): Copyable JSON assembled from translate results and patient info.

Tips:
- Use either NAMASTE code or ICD Name for translation.
- The Search field can filter `$expand` when populated.
- The page works with your JWT if signed in, or uses a dev token in development.
