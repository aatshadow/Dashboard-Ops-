import { useCallback } from 'react'
import { useClient } from '../contexts/ClientContext'
import * as data from '../utils/data'

export function useClientData() {
  const { clientId } = useClient()

  return {
    getSales: useCallback(() => data.getSales(clientId), [clientId]),
    addSale: useCallback((sale) => data.addSale(sale, clientId), [clientId]),
    addSales: useCallback((sales) => data.addSales(sales, clientId), [clientId]),
    updateSale: data.updateSale,
    deleteSale: data.deleteSale,
    getSalesWithNetCash: useCallback(() => data.getSalesWithNetCash(clientId), [clientId]),

    getReports: useCallback(() => data.getReports(clientId), [clientId]),
    addReport: useCallback((report) => data.addReport(report, clientId), [clientId]),
    addReports: useCallback((reports) => data.addReports(reports, clientId), [clientId]),
    updateReport: data.updateReport,
    deleteReport: data.deleteReport,

    getTeam: useCallback(() => data.getTeam(clientId), [clientId]),
    addMember: useCallback((member) => data.addMember(member, clientId), [clientId]),
    updateMember: data.updateMember,
    deleteMember: data.deleteMember,
    authenticateUser: useCallback((email, password) => data.authenticateUser(email, password, clientId), [clientId]),

    getProjections: useCallback(() => data.getProjections(clientId), [clientId]),
    addProjection: useCallback((projection) => data.addProjection(projection, clientId), [clientId]),
    updateProjection: data.updateProjection,
    deleteProjection: data.deleteProjection,

    getProducts: useCallback(() => data.getProducts(clientId), [clientId]),
    addProduct: useCallback((product) => data.addProduct(product, clientId), [clientId]),
    updateProduct: data.updateProduct,
    deleteProduct: data.deleteProduct,

    getPaymentFees: useCallback(() => data.getPaymentFees(clientId), [clientId]),
    addPaymentFee: useCallback((fee) => data.addPaymentFee(fee, clientId), [clientId]),
    updatePaymentFee: data.updatePaymentFee,
    deletePaymentFee: data.deletePaymentFee,

    getN8nConfig: useCallback(() => data.getN8nConfig(clientId), [clientId]),
    saveN8nConfig: useCallback((config) => data.saveN8nConfig(config, clientId), [clientId]),

    importSaleFromClose: useCallback((d) => data.importSaleFromClose(d, clientId), [clientId]),

    // CEO Mind
    getCeoMeetings: useCallback(() => data.getCeoMeetings(clientId), [clientId]),
    addCeoMeeting: useCallback((meeting) => data.addCeoMeeting(meeting, clientId), [clientId]),
    updateCeoMeeting: data.updateCeoMeeting,
    deleteCeoMeeting: data.deleteCeoMeeting,

    getCeoProjects: useCallback(() => data.getCeoProjects(clientId), [clientId]),
    addCeoProject: useCallback((project) => data.addCeoProject(project, clientId), [clientId]),
    updateCeoProject: data.updateCeoProject,
    deleteCeoProject: data.deleteCeoProject,

    getCeoIdeas: useCallback(() => data.getCeoIdeas(clientId), [clientId]),
    addCeoIdea: useCallback((idea) => data.addCeoIdea(idea, clientId), [clientId]),
    updateCeoIdea: data.updateCeoIdea,
    deleteCeoIdea: data.deleteCeoIdea,

    getCeoDailyDigests: useCallback(() => data.getCeoDailyDigests(clientId), [clientId]),
    getCeoWeeklyDigests: useCallback(() => data.getCeoWeeklyDigests(clientId), [clientId]),

    getCeoTeamNotes: useCallback(() => data.getCeoTeamNotes(clientId), [clientId]),
    saveCeoTeamNote: useCallback((memberId, note) => data.saveCeoTeamNote(memberId, note, clientId), [clientId]),

    getCeoIntegrations: useCallback(() => data.getCeoIntegrations(clientId), [clientId]),
    saveCeoIntegration: useCallback((integration) => data.saveCeoIntegration(integration, clientId), [clientId]),

    // CEO Finance
    getCeoFinanceEntries: useCallback(() => data.getCeoFinanceEntries(clientId), [clientId]),
    addCeoFinanceEntry: useCallback((entry) => data.addCeoFinanceEntry(entry, clientId), [clientId]),
    updateCeoFinanceEntry: data.updateCeoFinanceEntry,
    deleteCeoFinanceEntry: data.deleteCeoFinanceEntry,
    getCeoFinanceSummary: useCallback((yearMonth) => data.getCeoFinanceSummary(clientId, yearMonth), [clientId]),
  }
}
