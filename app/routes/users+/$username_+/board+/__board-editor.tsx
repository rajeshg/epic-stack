import { conform, useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { invariant } from '@epic-web/invariant'
import { type Board } from '@prisma/client'
import {
	json,
	type ActionFunctionArgs,
	type SerializeFrom,
} from '@remix-run/node'
import { Form, useActionData } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { getUserById, requireUserId } from '#app/utils/auth.server.ts'
import { validateCSRF } from '#app/utils/csrf.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { redirectWithToast } from '#app/utils/toast.server'
import { INTENTS } from '../board_.$id_+/types'

const nameMinLength = 1
const nameMaxLength = 100
const colorMinLength = 1
const colorMaxLength = 10

const BoardEditorSchema = z.object({
	id: z.number().optional(),
	name: z.string().min(nameMinLength).max(nameMaxLength),
	color: z.string().min(colorMinLength).max(colorMaxLength).default('#cbd5e1'),
})

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const user = await getUserById(userId)
	invariant(user, 'User not found')
	const formData = await request.formData()
	await validateCSRF(formData, request.headers)

	if (formData.get('intent') === INTENTS.deleteBoard) {
		const BoardDeleteSchema = z.object({
			boardId: z.number(),
		})
		const submission = await parse(formData, {
			async: true,
			schema: BoardDeleteSchema.superRefine(async (data, ctx) => {
				if (!data.boardId) return

				const board = await prisma.board.findUnique({
					select: { id: true },
					where: { id: data.boardId, userId },
				})
				if (!board) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: 'Board not found',
					})
				}
			}),
		})

		const { boardId: boardIdToDelete } = submission.value!
		await prisma.board.delete({
			where: { id: boardIdToDelete },
		})
		return redirectWithToast(`/users/${user.username}/board`, {
			type: 'success',
			title: 'Success',
			description: 'Your board has been deleted.',
		})
	}

	const submission = await parse(formData, {
		async: true,
		schema: BoardEditorSchema.superRefine(async (data, ctx) => {
			if (!data.id) return

			const board = await prisma.board.findUnique({
				select: { id: true },
				where: { id: data.id, userId },
			})
			if (!board) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Board not found',
				})
			}
		}),
	})

	if (submission.intent !== 'submit') {
		return json({ submission } as const)
	}

	if (!submission.value) {
		return json({ submission } as const, { status: 400 })
	}

	const { id: boardId, name, color } = submission.value
	const updatedBoard = await prisma.board.upsert({
		select: { id: true, user: { select: { username: true } } },
		where: { id: boardId ?? 0 },
		create: {
			userId: userId,
			name,
			color,
		},
		update: {
			name,
			color,
		},
	})

	return redirectWithToast(`/users/${user.username}/board/${updatedBoard.id}`, {
		type: 'success',
		title: 'Success',
		description: `Your board has been ${boardId ? 'updated' : 'created'}.`,
	})
}

export function BoardEditor({
	board,
}: {
	board?: SerializeFrom<Pick<Board, 'id' | 'name' | 'color'>>
}) {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()

	const [form, fields] = useForm({
		id: 'board-editor',
		constraint: getFieldsetConstraint(BoardEditorSchema),
		lastSubmission: actionData?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: BoardEditorSchema })
		},
		defaultValue: {
			name: board?.name ?? '',
			color: board?.color ?? '#cbd5e1',
		},
	})

	return (
		<div>
			<Form
				method="POST"
				className="flex h-full max-w-md flex-col gap-y-1 overflow-y-auto overflow-x-hidden rounded-lg px-5 py-2"
				{...form.props}
				encType="multipart/form-data"
			>
				<AuthenticityTokenInput />
				{/*
					This hidden submit button is here to ensure that when the user hits
					"enter" on an input field, the primary form function is submitted
					rather than the first button in the form (which is delete/add image).
				*/}
				<h2 className="my-0 mb-2 text-xl font-bold">
					{board ? 'Edit' : 'Add'} board
				</h2>
				<button type="submit" className="hidden" />
				{board ? <input type="hidden" name="id" value={board.id} /> : null}

				<Field
					labelProps={{ children: 'Name' }}
					inputProps={{
						autoFocus: true,
						...conform.input(fields.name, { ariaAttributes: true }),
					}}
					errors={fields.name.errors}
				/>
				<Field
					labelProps={{ children: 'Color' }}
					inputProps={{
						...conform.input(fields.color, {
							ariaAttributes: true,
							type: 'color',
						}),
					}}
					errors={fields.color.errors}
				/>
				<ErrorList id={form.errorId} errors={form.errors} />
				<div className="flex flex-row gap-4">
					<Button form={form.id} variant="destructive" type="reset">
						Reset
					</Button>
					<StatusButton
						form={form.id}
						type="submit"
						disabled={isPending}
						status={isPending ? 'pending' : 'idle'}
					>
						Submit
					</StatusButton>
				</div>
			</Form>
		</div>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>No board with the id "{params.boardId}" exists</p>
				),
			}}
		/>
	)
}
