import { createRouter, createWebHistory } from 'vue-router';
import ChatView from '@/views/ChatView.vue';
import BoardView from '@/views/BoardView.vue';
import VaultView from '@/views/VaultView.vue';
import DevicesView from '@/views/DevicesView.vue';
import SettingsView from '@/views/SettingsView.vue';
import TeamView from '@/views/TeamView.vue';

const routes = [
  { path: '/', redirect: '/chat' },
  { path: '/chat', name: 'chat', component: ChatView },
  { path: '/board', name: 'board', component: BoardView },
  { path: '/team', name: 'team', component: TeamView },
  { path: '/vault', name: 'vault', component: VaultView },
  { path: '/devices', name: 'devices', component: DevicesView },
  { path: '/settings', name: 'settings', component: SettingsView },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
