import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

export default function NotFound() {
  return (
    <Card className="mx-auto mt-10 max-w-md p-10 text-center">
      <p className="text-4xl font-extrabold text-primary">404</p>
      <p className="mt-2 font-bold">This page doesn't exist</p>
      <Link to="/" className="mt-4 inline-block">
        <Button>Back to Dashboard</Button>
      </Link>
    </Card>
  )
}
