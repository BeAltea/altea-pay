"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SendEmailForm } from "@/components/super-admin/send-email-form"
import { EmailActivity } from "@/components/super-admin/email-activity"
import { Send, BarChart3 } from "lucide-react"

interface Company {
  id: string
  name: string
}

interface Recipient {
  id: string
  name: string
  email: string
  daysOverdue: number
}

interface EmailTrackingData {
  sentAt: string
  subject: string
  status: string
  history: Array<{ sentAt: string; subject: string; status: string }>
}

interface SendEmailPageClientProps {
  companies: Company[]
  recipientsMap: Record<string, Recipient[]>
  emailTrackingMap: Record<string, EmailTrackingData>
}

export function SendEmailPageClient({
  companies,
  recipientsMap,
  emailTrackingMap,
}: SendEmailPageClientProps) {
  return (
    <Tabs defaultValue="send" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="send" className="gap-2">
          <Send className="h-4 w-4" />
          Enviar Email
        </TabsTrigger>
        <TabsTrigger value="activity" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          Atividade de Emails
        </TabsTrigger>
      </TabsList>

      <TabsContent value="send" className="mt-6">
        <SendEmailForm
          companies={companies}
          recipientsMap={recipientsMap}
          emailTrackingMap={emailTrackingMap}
        />
      </TabsContent>

      <TabsContent value="activity" className="mt-6">
        <EmailActivity companies={companies} />
      </TabsContent>
    </Tabs>
  )
}
