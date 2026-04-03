import axios from 'axios'

export function createJobsApi(baseUrl) {
  const client = axios.create({
    baseURL: baseUrl,
    timeout: 10000,
  })

  return {
    async createJob(input) {
      const response = await client.post('/jobs', input)
      return response.data?.job ?? null
    },
    async getJobStatus(jobId) {
      const response = await client.get(`/jobs/${encodeURIComponent(jobId)}`)
      return response.data?.job ?? null
    },
  }
}

export function getApiErrorMessage(error, fallback) {
  const payload = error?.response?.data

  if (payload?.error?.message) {
    return payload.error.message
  }

  return fallback
}
