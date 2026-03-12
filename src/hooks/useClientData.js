import { useCallback } from 'react'
import { useClient } from '../contexts/ClientContext'
import * as data from '../utils/data'

export function useClientData() {
  const { clientId } = useClient()

  return {
    getSales: useCallback(() => data.getSales(clientId), [clientId]),
    addSale: useCallback((sale) => data.addSale(sale, clientId), [clientId]),
    addSales: useCallback((sales) => data.addSales(sales, clientId), [clientId]),
    updateSale: useCallback((id, updates) => data.updateSale(id, updates, clientId), [clientId]),
    deleteSale: useCallback((id) => data.deleteSale(id, clientId), [clientId]),
    getSalesWithNetCash: useCallback(() => data.getSalesWithNetCash(clientId), [clientId]),

    getReports: useCallback(() => data.getReports(clientId), [clientId]),
    addReport: useCallback((report) => data.addReport(report, clientId), [clientId]),
    addReports: useCallback((reports) => data.addReports(reports, clientId), [clientId]),
    updateReport: useCallback((id, updates) => data.updateReport(id, updates, clientId), [clientId]),
    deleteReport: useCallback((id) => data.deleteReport(id, clientId), [clientId]),

    getTeam: useCallback(() => data.getTeam(clientId), [clientId]),
    addMember: useCallback((member) => data.addMember(member, clientId), [clientId]),
    updateMember: useCallback((id, updates) => data.updateMember(id, updates, clientId), [clientId]),
    deleteMember: useCallback((id) => data.deleteMember(id, clientId), [clientId]),
    authenticateUser: useCallback((email, password) => data.authenticateUser(email, password, clientId), [clientId]),

    getProjections: useCallback(() => data.getProjections(clientId), [clientId]),
    addProjection: useCallback((projection) => data.addProjection(projection, clientId), [clientId]),
    updateProjection: useCallback((id, updates) => data.updateProjection(id, updates, clientId), [clientId]),
    deleteProjection: useCallback((id) => data.deleteProjection(id, clientId), [clientId]),

    getProducts: useCallback(() => data.getProducts(clientId), [clientId]),
    addProduct: useCallback((product) => data.addProduct(product, clientId), [clientId]),
    updateProduct: useCallback((id, updates) => data.updateProduct(id, updates, clientId), [clientId]),
    deleteProduct: useCallback((id) => data.deleteProduct(id, clientId), [clientId]),

    getPaymentFees: useCallback(() => data.getPaymentFees(clientId), [clientId]),
    addPaymentFee: useCallback((fee) => data.addPaymentFee(fee, clientId), [clientId]),
    updatePaymentFee: useCallback((id, updates) => data.updatePaymentFee(id, updates, clientId), [clientId]),
    deletePaymentFee: useCallback((id) => data.deletePaymentFee(id, clientId), [clientId]),

    getN8nConfig: useCallback(() => data.getN8nConfig(clientId), [clientId]),
    saveN8nConfig: useCallback((config) => data.saveN8nConfig(config, clientId), [clientId]),

    importSaleFromClose: useCallback((d) => data.importSaleFromClose(d, clientId), [clientId]),

    // CEO Mind
    getCeoMeetings: useCallback(() => data.getCeoMeetings(clientId), [clientId]),
    addCeoMeeting: useCallback((meeting) => data.addCeoMeeting(meeting, clientId), [clientId]),
    updateCeoMeeting: useCallback((id, updates) => data.updateCeoMeeting(id, updates, clientId), [clientId]),
    deleteCeoMeeting: useCallback((id) => data.deleteCeoMeeting(id, clientId), [clientId]),

    getCeoProjects: useCallback(() => data.getCeoProjects(clientId), [clientId]),
    addCeoProject: useCallback((project) => data.addCeoProject(project, clientId), [clientId]),
    updateCeoProject: useCallback((id, updates) => data.updateCeoProject(id, updates, clientId), [clientId]),
    deleteCeoProject: useCallback((id) => data.deleteCeoProject(id, clientId), [clientId]),

    getCeoIdeas: useCallback(() => data.getCeoIdeas(clientId), [clientId]),
    addCeoIdea: useCallback((idea) => data.addCeoIdea(idea, clientId), [clientId]),
    updateCeoIdea: useCallback((id, updates) => data.updateCeoIdea(id, updates, clientId), [clientId]),
    deleteCeoIdea: useCallback((id) => data.deleteCeoIdea(id, clientId), [clientId]),

    getCeoDailyDigests: useCallback(() => data.getCeoDailyDigests(clientId), [clientId]),
    getCeoWeeklyDigests: useCallback(() => data.getCeoWeeklyDigests(clientId), [clientId]),

    getCeoTeamNotes: useCallback(() => data.getCeoTeamNotes(clientId), [clientId]),
    saveCeoTeamNote: useCallback((memberId, note) => data.saveCeoTeamNote(memberId, note, clientId), [clientId]),

    getCeoIntegrations: useCallback(() => data.getCeoIntegrations(clientId), [clientId]),
    saveCeoIntegration: useCallback((integration) => data.saveCeoIntegration(integration, clientId), [clientId]),

    // CEO Finance
    getCeoFinanceEntries: useCallback(() => data.getCeoFinanceEntries(clientId), [clientId]),
    addCeoFinanceEntry: useCallback((entry) => data.addCeoFinanceEntry(entry, clientId), [clientId]),
    updateCeoFinanceEntry: useCallback((id, updates) => data.updateCeoFinanceEntry(id, updates, clientId), [clientId]),
    deleteCeoFinanceEntry: useCallback((id) => data.deleteCeoFinanceEntry(id, clientId), [clientId]),
    getCeoFinanceSummary: useCallback((yearMonth) => data.getCeoFinanceSummary(clientId, yearMonth), [clientId]),

    // Commission Payments
    getCommissionPayments: useCallback(() => data.getCommissionPayments(clientId), [clientId]),
    upsertCommissionPayment: useCallback((payment) => data.upsertCommissionPayment(payment, clientId), [clientId]),
    toggleCommissionPaid: useCallback((paymentId, paid) => data.toggleCommissionPaid(paymentId, paid), [clientId]),
  }
}
