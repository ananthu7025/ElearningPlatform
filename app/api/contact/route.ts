import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { name, email, message } = await request.json()

    // Validation
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Here you can add your logic to:
    // 1. Save to database
    // 2. Send email
    // 3. Store in a contact requests table
    // For now, we'll just log it and return success

    console.log('Contact form submission:', { name, email, message })

    // TODO: Implement actual contact handling (database storage, email notification, etc.)
    // Example with Prisma:
    // const contact = await prisma.contactRequest.create({
    //   data: { name, email, message, createdAt: new Date() }
    // })

    return NextResponse.json(
      { message: 'Thank you for your message. We will get back to you soon.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to process your request' },
      { status: 500 }
    )
  }
}
