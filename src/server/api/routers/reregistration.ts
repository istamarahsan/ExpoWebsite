import { z } from "zod"
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc"
import { google } from "googleapis"
import { env } from "~/env.mjs"

export const reregistrationRouter = createTRPCRouter({
    submit: publicProcedure
        .input(
            z.object({
                fullName: z.string().nonempty(),
                nim: z.string().nonempty(),
                discordUserName: z.string().nonempty(),
                discordUserId: z.string().nonempty(),
            })
        )
        .mutation(async ({ input }) => {
            if (!env.GSHEETS_JSON_KEY_64 || !env.TARGET_SPREADSHEET_ID) {
                return true
            }

            const parseCreds = z
                .object({
                    project_id: z.string().nonempty(),
                    private_key: z.string().nonempty(),
                    client_email: z.string().nonempty(),
                })
                .safeParse(JSON.parse(Buffer.from(env.GSHEETS_JSON_KEY_64, "base64").toString()))

            if (!parseCreds.success) {
                throw new Error("Internal Server Error")
            }

            const creds = parseCreds.data

            const auth = new google.auth.GoogleAuth({
                projectId: creds.project_id,
                credentials: {
                    client_email: creds.client_email,
                    private_key: creds.private_key,
                },
                scopes: ["https://www.googleapis.com/auth/spreadsheets"],
            })

            const sheetsClient = google.sheets({
                version: "v4",
                auth: auth,
            })

            const appendResult = await sheetsClient.spreadsheets.values.append({
                spreadsheetId: env.TARGET_SPREADSHEET_ID,
                range: "DaftarUlang!A1:E1",
                valueInputOption: "USER_ENTERED",
                requestBody: {
                    values: [
                        [
                            input.fullName,
                            input.nim,
                            input.discordUserName,
                            input.discordUserId,
                            "FALSE",
                        ],
                    ],
                },
            })

            if (appendResult.status !== 200) {
                throw new Error("Google Services Error")
            }

            return true
        }),
})
