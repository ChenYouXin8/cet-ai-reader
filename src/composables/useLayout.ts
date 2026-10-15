import { ref } from 'vue'

/** 三栏布局的折叠状态 */
const navOpen = ref(true)
const panelOpen = ref(true)

/**
 * 窄窗口下自动收起两侧栏，避免中间精读栏被挤成细条。
 * 只做“收起”，不会自动展开，以免覆盖用户的手动选择。
 */
function syncLayoutToViewport() {
  if (window.innerWidth < 1280) panelOpen.value = false
  if (window.innerWidth < 860) navOpen.value = false
}

syncLayoutToViewport()
window.addEventListener('resize', syncLayoutToViewport)

export function useLayout() {
  return {
    navOpen,
    panelOpen,
    toggleNav() {
      navOpen.value = !navOpen.value
    },
    togglePanel() {
      panelOpen.value = !panelOpen.value
    },
  }
}
