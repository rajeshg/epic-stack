export function badRequest(body: string) {
	return new Response(body, {
		status: 400,
		statusText: 'Bad Request',
	})
}
