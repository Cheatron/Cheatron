import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import App from '@/App'

describe('App', () => {
  test('renders functionality correctly', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Check Header
    expect(screen.getByText(/Production Ready/i)).toBeInTheDocument()

    // Test Counter
    const incrementBtn = screen.getByRole('button', { name: /Increment/i })
    expect(screen.getByText('0')).toBeInTheDocument()

    await user.click(incrementBtn)
    expect(screen.getByText('1')).toBeInTheDocument()

    // Test Input
    const input = screen.getByPlaceholderText(/Type something.../i)
    await user.type(input, 'Hello Cheatron')

    expect(screen.getByText(/You typed:/i)).toBeInTheDocument()
    expect(screen.getByText('Hello Cheatron')).toBeInTheDocument()
  })
})
