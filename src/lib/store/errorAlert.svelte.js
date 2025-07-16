export const errorData = $state({
    showError: false,
    errorMessage: ""
})

export function showErrorAlert(msg) {
    errorData.errorMessage = msg;
    setTimeout(() => (errorData.showError = true), 2500)
    setTimeout(() => (errorData.showError = false), 6500);
}