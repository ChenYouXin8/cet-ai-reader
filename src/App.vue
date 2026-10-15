<script setup lang="ts">
import { onMounted } from 'vue'
import AiPanel from '@/components/AiPanel.vue'
import ArticleReader from '@/components/ArticleReader.vue'
import SidebarNav from '@/components/SidebarNav.vue'
import { useArticles } from '@/composables/useArticles'
import { useLayout } from '@/composables/useLayout'

const { load } = useArticles()
const { panelOpen } = useLayout()

onMounted(load)
</script>

<template>
  <div class="flex h-full w-full overflow-hidden font-sans">
    <SidebarNav />
    <ArticleReader />
    <AiPanel v-if="panelOpen" />
  </div>
</template>
