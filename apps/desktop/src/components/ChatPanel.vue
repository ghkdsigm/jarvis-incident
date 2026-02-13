<template>
  <div class="h-full flex flex-col min-h-0">
    <div class="border-b t-border" :class="isMiniMode ? 'p-2' : 'p-3'">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <div class="text-sm font-semibold truncate" :class="theme === 'dark' ? 'text-white' : 'text-black'">{{ store.activeRoom?.title ?? "No room" }}</div>
          <div v-if="!isMiniMode" class="text-xs t-text-subtle font-mono truncate">{{ store.activeRoomId }}</div>
        </div>
        <div v-if="store.activeRoomId && !isMiniMode" class="flex items-center gap-2 shrink-0">
          <button
            class="h-8 w-16 inline-flex items-center justify-center rounded"
            :class="activePane === 'insights' ? 't-btn-primary' : 't-btn-secondary'"
            title="인사이트 (아이디어 카드/지식 그래프)"
            aria-label="인사이트 (아이디어 카드/지식 그래프)"
            @click="toggleInsightsPane"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M9 18h6M10 22h4"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M8 14c-1.2-1-2-2.5-2-4.2A6 6 0 0 1 12 4a6 6 0 0 1 6 5.8c0 1.7-.8 3.2-2 4.2-1 0.8-1.5 2.1-1.5 3.4V18H9.5v-.6c0-1.3-.5-2.6-1.5-3.4Z"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            class="h-8 w-8 inline-flex items-center justify-center rounded t-btn-secondary"
            title="이름 변경"
            aria-label="채팅방 이름 변경"
            @click="openRenameRoom"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8L17.3 5a2 2 0 0 0-2.8 0L4 15.5V20Z"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M13.5 6.5 17.5 10.5"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            class="h-8 w-8 inline-flex items-center justify-center rounded t-btn-secondary text-[#FB4F4F]"
            title="방 삭제"
            aria-label="채팅방 삭제"
            @click="openDeleteRoom"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 7h16"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M10 11v7M14 11v7"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M6 7l1 14h10l1-14"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M9 7V4h6v3"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div v-if="store.activeRoomId && !isMiniMode" class="p-3 border-b t-border t-surface space-y-2">
      <div class="flex items-center justify-between gap-2">
        <div class="text-xs t-text-muted">
          화면 공유:
          <span class="t-text">
            {{ store.screenShareRoomId === store.activeRoomId ? store.screenShareMode : "idle" }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="h-6 w-6 inline-flex items-center justify-center rounded t-btn-secondary"
            title="오늘의 채팅방 주제 관련 뉴스"
            aria-label="오늘의 채팅방 주제 관련 뉴스"
            @click="openNewsPopup"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 4h16v12H4V4Z"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M8 8h8M8 12h5"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button class="px-2 py-1 text-xs rounded t-btn-secondary" @click="openInvite">
            + 동료추가
          </button>
          <button
            class="px-2 py-1 text-xs rounded t-btn-secondary"
            title="참여했던 이전 채팅방의 최근 회의 내용을 요약해 이 방에 가져옵니다"
            @click="openPastMeetingImport"
          >
            채팅방 회의록 불러오기
          </button>
          <button
            class="px-2 py-1 text-xs rounded t-btn-secondary"
            :disabled="store.screenShareMode === 'sharing' && store.screenShareRoomId === store.activeRoomId"
            title="채팅중인 사람들의 화면을 공유합니다."
            @click="startShare"
          >
            화면 공유 시작
          </button>
          <button class="px-2 py-1 text-xs rounded t-btn-secondary" @click="stopShare">중지</button>
        </div>
      </div>

      <div
        v-if="store.screenShareRoomId === store.activeRoomId && (store.screenShareRemote || store.screenShareLocal)"
        class="grid grid-cols-2 gap-2"
      >
        <div class="space-y-1">
          <div class="text-[11px] t-text-subtle">상대 화면</div>
          <video
            ref="remoteVideo"
            class="w-full h-40 bg-black rounded border t-border object-contain"
            autoplay
            playsinline
          />
        </div>
        <div class="space-y-1">
          <div class="text-[11px] t-text-subtle">내 화면(프리뷰)</div>
          <video
            ref="localVideo"
            class="w-full h-40 bg-black rounded border t-border object-contain"
            autoplay
            muted
            playsinline
          />
        </div>
      </div>
    </div>

    <div
      class="flex-1 min-h-0 t-surface"
      :class="[activePane === 'chat' && isTranslateOn ? 'overflow-hidden' : '', theme === 'dark' ? 'bg-zinc-900' : 'bg-gray-100']"
    >
      <template v-if="activePane === 'chat'">
        <template v-if="!isTranslateOn">
          <div
            ref="scroller"
            class="h-full overflow-auto space-y-2 t-scrollbar max-w-[1100px] mx-auto"
            :class="isMiniMode ? 'p-2' : 'py-6 px-6'"
            :style="{ opacity: String(chatOpacity) }"
          >
          <div
            v-if="store.messageSearchQuery && messageSearchMatches.length"
            class="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-lg border t-border px-3 py-2 mb-2 text-sm t-surface"
          >
            <span class="t-text-subtle">"{{ store.messageSearchQuery }}" {{ messageSearchMatches.length }}개 일치</span>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="h-7 w-7 inline-flex items-center justify-center rounded t-btn-secondary"
                title="이전 일치"
                aria-label="이전 일치"
                :disabled="messageSearchMatches.length === 0"
                @click="scrollToSearchMatch(-1)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
              </button>
              <span class="text-xs t-text-muted min-w-[2ch] text-center">{{ searchHighlightIndex + 1 }}/{{ messageSearchMatches.length }}</span>
              <button
                type="button"
                class="h-7 w-7 inline-flex items-center justify-center rounded t-btn-secondary"
                title="다음 일치"
                aria-label="다음 일치"
                :disabled="messageSearchMatches.length === 0"
                @click="scrollToSearchMatch(1)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
              </button>
            </div>
          </div>
          <div
            v-for="m in store.activeMessages"
            :key="m.id"
            :ref="(el) => setMessageEl(m.id, el)"
            class="w-full"
            @contextmenu.prevent="onMessageContextMenu($event, m)"
          >
            <div class="flex" :class="bubbleWrapClass(m)">
              <div class="max-w-[72%] min-w-0 flex flex-col" :class="bubbleColumnClass(m)">
                <div class="text-[11px] t-text-subtle flex items-center gap-2 w-full" :class="metaClass(m)">
                  <span v-if="isBot(m)" class="inline-flex items-center font-mono" title="AI">
                    <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 2a2 2 0 0 1 2 2v1H10V4a2 2 0 0 1 2-2z" fill="#00AD50"/>
                      <rect x="6" y="7" width="12" height="10" rx="2" stroke="#00AD50" stroke-width="1.5" fill="none"/>
                      <circle cx="9.5" cy="11.5" r="1.25" fill="#00AD50"/>
                      <circle cx="14.5" cy="11.5" r="1.25" fill="#00AD50"/>
                      <path d="M9 15h6" stroke="#00AD50" stroke-width="1.5" stroke-linecap="round"/>
                      <path d="M12 17v3" stroke="#00AD50" stroke-width="1.2" stroke-linecap="round"/>
                      <path d="M9 20h6" stroke="#00AD50" stroke-width="1.2" stroke-linecap="round"/>
                    </svg>
                  </span>
                  <span v-else class="font-mono">{{ labelFor(m) }}</span>
                  <span class="tabular-nums">{{ formatChatTime(m.createdAt) }}</span>
                  <span v-if="isDeleted(m)" class="t-text-faint">삭제됨</span>
                  <span v-else-if="isMessageConfirmed(m)" class="text-[#00CE7D]" title="확인완료">✓</span>
                  <button
                    type="button"
                    class="h-5 w-5 inline-flex items-center justify-center rounded t-btn-secondary shrink-0 bg-transparent border-0 disabled:opacity-40"
                    :class="isMessageSavedAsCard(m) ? 'text-[#FB4F4F]' : ''"
                    :title="isMessageSavedAsCard(m) ? '아이디어 카드에 저장됨' : '아이디어 카드로 저장'"
                    :aria-label="isMessageSavedAsCard(m) ? '아이디어 카드에 저장됨' : '아이디어 카드로 저장'"
                    :disabled="isDeleted(m)"
                    @pointerdown.stop
                    @click.stop="saveMessageAsCard(m)"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M7 3h10a2 2 0 0 1 2 2v16l-7-4-7 4V5a2 2 0 0 1 2-2Z"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="ml-auto h-5 w-5 inline-flex items-center justify-center rounded t-btn-secondary shrink-0 bg-transparent border-0"
                    title="이 메시지로 AI 질문/요청"
                    aria-label="이 메시지로 AI 질문/요청"
                    @pointerdown.stop
                    @click.stop="openJarvisPopoverFromMessage(m)"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect
                        x="6"
                        y="6"
                        width="12"
                        height="12"
                        rx="3"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path d="M10 12h.01" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" />
                      <path d="M14 12h.01" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" />
                      <path
                        d="M9 15h6"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                  <div v-if="canEditOrDelete(m)" class="relative">
                    <button
                      type="button"
                      class="h-5 w-5 inline-flex items-center justify-center rounded t-btn-secondary shrink-0 bg-transparent border-0"
                      title="메시지 메뉴"
                      aria-label="메시지 메뉴"
                      @pointerdown.stop
                      @click.stop="toggleMessageMenu(m)"
                    >
                      ⋯
                    </button>
                    <div
                      v-if="messageMenuOpenId === m.id"
                      class="absolute z-10 mt-1 right-0 w-[120px] rounded border t-border t-surface shadow-lg p-1"
                      @pointerdown.stop
                    >
                      <button
                        type="button"
                        class="w-full text-left px-2 py-1.5 text-xs rounded t-btn-secondary bg-transparent border-0 hover:t-row"
                        @click="startEdit(m); closeMessageMenu()"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        class="w-full text-left px-2 py-1.5 text-xs rounded t-btn-secondary bg-transparent border-0 hover:t-row"
                        @click="confirmDelete(m); closeMessageMenu()"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>

              <div
                class="group mt-1 max-w-full rounded-2xl border px-3 py-2 text-sm whitespace-pre-wrap break-words font-normal"
                :class="[bubbleClass(m), editingId === m.id ? 'block w-full' : 'inline-block']"
              >
                <template v-if="editingId === m.id">
                  <textarea
                    v-model="editingText"
                    class="w-full min-h-[72px] px-2 py-1 text-sm rounded t-input t-input-strong"
                  />
                  <div class="mt-2 flex items-center justify-end gap-2">
                    <button class="px-2 py-1 text-xs rounded t-btn-secondary" @click="cancelEdit">취소</button>
                    <button
                      class="px-2 py-1 text-xs rounded t-btn-primary disabled:opacity-50"
                      :disabled="!editingText.trim().length && !editingHasAttachments"
                      @click="submitEdit(m)"
                    >
                      저장
                    </button>
                  </div>
                </template>
                <template v-else>
                  <template v-if="isDeleted(m)">
                    <div class="italic t-text-muted">(삭제된 메시지)</div>
                  </template>
                  <template v-else>
                    <div v-if="parsedFor(m).text" v-html="highlightedMessageHtml(m)"></div>

                    <div v-if="parsedFor(m).attachments.length" class="mt-2 space-y-2">
                      <div
                        v-for="(a, idx) in parsedFor(m).attachments"
                        :key="idx"
                        class="msg-attach rounded-lg"
                      >
                        <template v-if="a.kind === 'image'">
                          <a
                            v-if="a.dataUrl"
                            :href="a.dataUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="block"
                            :title="a.name"
                          >
                            <img :src="a.dataUrl" :alt="a.name" class="msg-attach-image rounded-md object-cover" />
                          </a>
                          <div v-else class="text-xs t-text-subtle">이미지(미리보기 불가): {{ a.name }}</div>
                          <div class="mt-1 text-[11px] truncate" :class="theme === 'dark' ? 'text-white' : 'text-gray-500'">{{ a.name }} · {{ formatBytes(a.size) }}</div>
                        </template>
                        <template v-else>
                          <div class="flex items-center gap-2 min-w-0">
                            <span class="text-sm leading-none">📎</span>
                            <div class="min-w-0 flex-1">
                              <div class="text-xs t-text-muted truncate">{{ a.name }}</div>
                              <div class="text-[11px] t-text-subtle">{{ formatBytes(a.size) }}</div>
                            </div>
                            <a
                              v-if="a.dataUrl"
                              :href="a.dataUrl"
                              :download="a.name"
                              class="px-2 py-1 text-[11px] rounded t-btn-secondary"
                            >
                              다운로드
                            </a>
                            <span v-else class="text-[11px] t-text-subtle">전송 누락</span>
                          </div>
                        </template>
                      </div>
                    </div>

                  <!-- <div v-if="canEditOrDelete(m)" class="mt-2 hidden group-hover:flex items-center justify-end gap-2">
                    <button class="px-2 py-1 text-xs rounded t-btn-secondary" @click="startEdit(m)">수정</button>
                    <button class="px-2 py-1 text-xs rounded t-btn-danger" @click="confirmDelete(m)">삭제</button>
                  </div> -->
                  </template>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
        </template>

      <template v-else>
        <div class="h-full grid grid-cols-2 gap-2" :class="isMiniMode ? 'p-2' : 'p-3'">
        <div class="min-h-0 rounded border t-border overflow-hidden">
          <div
            ref="scrollerLeft"
            class="h-full overflow-auto space-y-2 t-surface t-scrollbar p-3"
            :style="{ opacity: String(chatOpacity) }"
            @scroll="onScrollLeft"
          >
            <div
              v-if="store.messageSearchQuery && messageSearchMatches.length"
              class="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-lg border t-border px-3 py-2 mb-2 text-sm t-surface"
            >
              <span class="t-text-subtle">"{{ store.messageSearchQuery }}" {{ messageSearchMatches.length }}개 일치</span>
              <div class="flex items-center gap-1">
                <button type="button" class="h-7 w-7 inline-flex items-center justify-center rounded t-btn-secondary" title="이전 일치" :disabled="messageSearchMatches.length === 0" @click="scrollToSearchMatch(-1)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg></button>
                <span class="text-xs t-text-muted min-w-[2ch] text-center">{{ searchHighlightIndex + 1 }}/{{ messageSearchMatches.length }}</span>
                <button type="button" class="h-7 w-7 inline-flex items-center justify-center rounded t-btn-secondary" title="다음 일치" :disabled="messageSearchMatches.length === 0" @click="scrollToSearchMatch(1)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>
              </div>
            </div>
            <div
              v-for="m in store.activeMessages"
              :key="m.id"
              :ref="(el) => setMessageEl(m.id, el)"
              class="w-full"
              @contextmenu.prevent="onMessageContextMenu($event, m)"
            >
              <div class="flex" :class="bubbleWrapClass(m)">
                <div class="max-w-[72%] min-w-0 flex flex-col" :class="bubbleColumnClass(m)">
                  <div class="text-[11px] t-text-subtle flex items-center gap-2 w-full" :class="metaClass(m)">
                    <span v-if="isBot(m)" class="inline-flex items-center font-mono" title="AI">
                      <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M12 2a2 2 0 0 1 2 2v1H10V4a2 2 0 0 1 2-2z" fill="#00AD50"/>
                        <rect x="6" y="7" width="12" height="10" rx="2" stroke="#00AD50" stroke-width="1.5" fill="none"/>
                        <circle cx="9.5" cy="11.5" r="1.25" fill="#00AD50"/>
                        <circle cx="14.5" cy="11.5" r="1.25" fill="#00AD50"/>
                        <path d="M9 15h6" stroke="#00AD50" stroke-width="1.5" stroke-linecap="round"/>
                        <path d="M12 17v3" stroke="#00AD50" stroke-width="1.2" stroke-linecap="round"/>
                        <path d="M9 20h6" stroke="#00AD50" stroke-width="1.2" stroke-linecap="round"/>
                      </svg>
                    </span>
                    <span v-else class="font-mono">{{ labelFor(m) }}</span>
                    <span class="tabular-nums">{{ formatChatTime(m.createdAt) }}</span>
                    <span v-if="isDeleted(m)" class="t-text-faint">삭제됨</span>
                    <span v-else-if="isMessageConfirmed(m)" class="text-[#00CE7D]" title="확인완료">✓</span>
                    <button
                      type="button"
                      class="ml-auto h-5 w-5 inline-flex items-center justify-center rounded t-btn-secondary shrink-0 bg-transparent border-0 disabled:opacity-40"
                      :class="isMessageSavedAsCard(m) ? 'text-[#FB4F4F]' : ''"
                      :title="isMessageSavedAsCard(m) ? '아이디어 카드에 저장됨' : '아이디어 카드로 저장'"
                      :aria-label="isMessageSavedAsCard(m) ? '아이디어 카드에 저장됨' : '아이디어 카드로 저장'"
                      :disabled="isDeleted(m)"
                      @pointerdown.stop
                      @click.stop="saveMessageAsCard(m)"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M7 3h10a2 2 0 0 1 2 2v16l-7-4-7 4V5a2 2 0 0 1 2-2Z"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </button>
                    <div v-if="canEditOrDelete(m)" class="relative">
                      <button
                        type="button"
                        class="h-5 w-5 inline-flex items-center justify-center rounded t-btn-secondary shrink-0 bg-transparent border-0"
                        title="메시지 메뉴"
                        aria-label="메시지 메뉴"
                        @pointerdown.stop
                        @click.stop="toggleMessageMenu(m)"
                      >
                        ⋯
                      </button>
                      <div
                        v-if="messageMenuOpenId === m.id"
                        class="absolute z-10 mt-1 right-0 w-[120px] rounded border t-border t-surface shadow-lg p-1"
                        @pointerdown.stop
                      >
                        <button
                          type="button"
                          class="w-full text-left px-2 py-1.5 text-xs rounded t-btn-secondary bg-transparent border-0 hover:t-row"
                          @click="startEdit(m); closeMessageMenu()"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          class="w-full text-left px-2 py-1.5 text-xs rounded t-btn-danger bg-transparent border-0 hover:t-row"
                          @click="confirmDelete(m); closeMessageMenu()"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                  <div
                    class="mt-1 max-w-full rounded-2xl border px-3 py-2 text-sm whitespace-pre-wrap break-words"
                    :class="[bubbleClass(m), editingId === m.id ? 'block w-full' : 'inline-block']"
                  >
                    <template v-if="editingId === m.id">
                      <textarea
                        v-model="editingText"
                        class="w-full min-h-[72px] px-2 py-1 text-sm rounded t-input t-input-strong"
                      />
                      <div class="mt-2 flex items-center justify-end gap-2">
                        <button class="px-2 py-1 text-xs rounded t-btn-secondary" @click="cancelEdit">취소</button>
                        <button
                          class="px-2 py-1 text-xs rounded t-btn-primary disabled:opacity-50"
                          :disabled="!editingText.trim().length && !editingHasAttachments"
                          @click="submitEdit(m)"
                        >
                          저장
                        </button>
                      </div>
                    </template>
                    <template v-else>
                      <template v-if="isDeleted(m)">
                        <div class="italic t-text-muted">(삭제된 메시지)</div>
                      </template>
                      <template v-else>
                        <div v-if="parsedFor(m).text" v-html="highlightedMessageHtml(m)"></div>
                        <div v-if="parsedFor(m).attachments.length" class="mt-2 space-y-2">
                          <div
                            v-for="(a, idx) in parsedFor(m).attachments"
                            :key="idx"
                            class="msg-attach rounded-lg border t-border bg-white/60 p-2"
                          >
                            <template v-if="a.kind === 'image'">
                              <a
                                v-if="a.dataUrl"
                                :href="a.dataUrl"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="block"
                                :title="a.name"
                              >
                                <img
                                  :src="a.dataUrl"
                                  :alt="a.name"
                                  class="msg-attach-image rounded-md border t-border object-cover"
                                />
                              </a>
                              <div v-else class="text-xs t-text-subtle">이미지(미리보기 불가): {{ a.name }}</div>
                              <div class="mt-1 text-[11px] t-text-muted truncate">{{ a.name }} · {{ formatBytes(a.size) }}</div>
                            </template>
                            <template v-else>
                              <div class="flex items-center gap-2 min-w-0">
                                <span class="text-sm leading-none">📎</span>
                                <div class="min-w-0 flex-1">
                                  <div class="text-xs t-text-muted truncate">{{ a.name }}</div>
                                  <div class="text-[11px] t-text-subtle">{{ formatBytes(a.size) }}</div>
                                </div>
                                <a
                                  v-if="a.dataUrl"
                                  :href="a.dataUrl"
                                  :download="a.name"
                                  class="px-2 py-1 text-[11px] rounded t-btn-secondary"
                                >
                                  다운로드
                                </a>
                                <span v-else class="text-[11px] t-text-subtle">전송 누락</span>
                              </div>
                            </template>
                          </div>
                        </div>
                      </template>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="min-h-0 rounded border t-border overflow-hidden">
          <div
            ref="scrollerRight"
            class="h-full overflow-auto space-y-2 t-surface t-scrollbar p-3"
            :style="{ opacity: String(chatOpacity) }"
            @scroll="onScrollRight"
          >
            <div v-for="m in store.activeMessages" :key="'tr:' + m.id" class="w-full" @contextmenu.prevent="onMessageContextMenu($event, m)">
              <div class="flex" :class="bubbleWrapClass(m)">
                <div class="max-w-[72%] min-w-0 flex flex-col" :class="bubbleColumnClass(m)">
                  <div class="text-[11px] t-text-subtle flex items-center gap-2 w-full" :class="metaClass(m)">
                    <span class="font-mono">{{ translateTargetLang }}</span>
                    <span class="tabular-nums">{{ formatChatTime(m.createdAt) }}</span>
                    <span v-if="isDeleted(m)" class="t-text-faint">삭제됨</span>
                    <span v-else-if="isMessageConfirmed(m)" class="text-[#00CE7D]" title="확인완료">✓</span>
                    <span v-else-if="translatePendingById[translationKeyFor(m)]" class="t-text-faint">번역 중…</span>
                  </div>
                  <div
                    class="mt-1 inline-block max-w-full rounded-2xl border px-3 py-2 text-sm whitespace-pre-wrap break-words"
                    :class="bubbleClass(m)"
                  >
                    <div :class="isDeleted(m) ? 'italic t-text-muted' : ''">
                      {{ isDeleted(m) ? "(삭제된 메시지)" : translatedTextFor(m) }}
                    </div>
                    <div v-if="!isDeleted(m) && shouldShowTranslatePendingHint(m)" class="text-xs t-text-subtle mt-1">
                      (번역 대기)
                    </div>
                    <div v-if="!isDeleted(m) && parsedFor(m).attachments.length" class="mt-2 space-y-2">
                      <div
                        v-for="(a, idx) in parsedFor(m).attachments"
                        :key="idx"
                        class="msg-attach rounded-lg border t-border bg-white/60 p-2"
                      >
                        <template v-if="a.kind === 'image'">
                          <a
                            v-if="a.dataUrl"
                            :href="a.dataUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="block"
                            :title="a.name"
                          >
                            <img :src="a.dataUrl" :alt="a.name" class="msg-attach-image rounded-md border t-border object-cover" />
                          </a>
                          <div v-else class="text-xs t-text-subtle">이미지(미리보기 불가): {{ a.name }}</div>
                          <div class="mt-1 text-[11px] t-text-muted truncate">{{ a.name }} · {{ formatBytes(a.size) }}</div>
                        </template>
                        <template v-else>
                          <div class="flex items-center gap-2 min-w-0">
                            <span class="text-sm leading-none">📎</span>
                            <div class="min-w-0 flex-1">
                              <div class="text-xs t-text-muted truncate">{{ a.name }}</div>
                              <div class="text-[11px] t-text-subtle">{{ formatBytes(a.size) }}</div>
                            </div>
                            <a
                              v-if="a.dataUrl"
                              :href="a.dataUrl"
                              :download="a.name"
                              class="px-2 py-1 text-[11px] rounded t-btn-secondary"
                            >
                              다운로드
                            </a>
                            <span v-else class="text-[11px] t-text-subtle">전송 누락</span>
                          </div>
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </template>
      </template>
      <template v-else>
        <div class="h-full overflow-auto t-surface t-scrollbar" :class="isMiniMode ? 'p-2' : 'p-3'">
          <div class="flex items-center gap-2 mb-3">
            <button
              type="button"
              title="아이디어 관련, 사용자가 직접 저장한 메시지나 AI가 채팅 분석 후 자동으로 메시지를 카드로 저장합니다."
              class="px-2.5 py-1.5 text-xs rounded inline-flex items-center gap-1.5"
              :class="insightsTab === 'cards' ? 't-btn-primary' : 't-btn-secondary'"
              @click="insightsTab = 'cards'"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="shrink-0">
                <path
                  d="M7 7h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M8.5 11h7M8.5 14h5"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span>아이디어 카드</span>
            </button>
            <button
              type="button"
              title="아이디어 관련, AI가 채팅 분석 후 자동으로 노드-엣지 그래프를 생성합니다."
              class="px-2.5 py-1.5 text-xs rounded inline-flex items-center gap-1.5"
              :class="insightsTab === 'graph' ? 't-btn-primary' : 't-btn-secondary'"
              @click="insightsTab = 'graph'"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="shrink-0">
                <path
                  d="M4 19V5"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M4 19h16"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M7 15l4-4 3 3 5-6"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M19 8v4h-4"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span>지식 그래프</span>
            </button>
            <button
              type="button"
              title="채팅·아이디어 카드·지식 그래프를 AI가 분석해 하나의 보고서와 인텔리전스 제안으로 정리합니다."
              class="px-2.5 py-1.5 text-xs rounded inline-flex items-center gap-1.5"
              :class="insightsTab === 'pulse' ? 't-btn-primary' : 't-btn-secondary'"
              @click="insightsTab = 'pulse'"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="shrink-0">
                <path
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M14 2v6h6"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M16 13H8M16 17H8M10 9H8"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span>Brain Pulse 리포트</span>
            </button>
            <div class="ml-auto flex items-center gap-2">
              <button
                type="button"
                class="px-2 py-1 text-xs rounded t-btn-secondary inline-flex items-center gap-1.5"
                title="새로고침"
                aria-label="새로고침"
                @click="refreshInsights"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="shrink-0">
                  <path
                    d="M21 12a9 9 0 0 0-15.5-6.5L3 8"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M3 3v5h5"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M3 12a9 9 0 0 0 15.5 6.5L21 16"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M21 21v-5h-5"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <button type="button" class="px-2 py-1 text-xs rounded t-btn-secondary" @click="runWeeklyAiUpdate">
                주간 업데이트
              </button>
            </div>
          </div>

          <div v-if="insightsTab === 'cards'">
            <div v-if="cardsError" class="mb-2 text-xs t-text-faint">에러: {{ cardsError }}</div>
            <div v-if="cardsLoading" class="text-xs t-text-subtle">카드 로딩 중…</div>
            <div v-else-if="!ideaCards.length" class="text-xs t-text-subtle">
              아직 저장된 카드가 없습니다. 메시지 옆의 북마크 아이콘으로 저장해보세요.
            </div>
            <div v-else class="flex flex-wrap gap-3">
              <div
                v-for="c in ideaCards"
                :key="c.id"
                class="w-full min-w-[280px] max-w-[380px] flex-[1_1_280px] rounded-lg border t-border t-surface shadow-sm p-3"
              >
                <div class="flex items-start gap-2">
                  <div class="min-w-0">
                    <div class="text-sm font-bold truncate" :class="theme === 'dark' ? 'text-white' : 'text-black'">{{ c.title }}</div>
                    <div class="mt-0.5 text-[9px] t-text-subtle flex items-center gap-2">
                      <span class="tabular-nums">{{ formatChatTime(c.createdAt) }}</span>
                      <span v-if="c.kind === 'weekly_ai'" class="px-1.5 py-0.5 rounded bg-[#C2D6BE] text-[#0C3A27]">
                        AI(주간)
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="ml-auto h-7 w-7 inline-flex items-center justify-center rounded t-btn-danger bg-transparent border-0"
                    title="카드 삭제"
                    aria-label="카드 삭제"
                    @click="removeCard(c.id)"
                  >
                    <span class="text-sm leading-none" :class="theme === 'dark' ? 'text-white' : 'text-black'">×</span>
                  </button>
                </div>

                <div class="mt-2 space-y-2 text-xs">
                  <div v-if="c.content?.problem">
                    <div class="font-bold" :class="theme === 'dark' ? 'text-[#00ad50]' : 'text-[#4fd1c5]'">Problem</div>
                    <div class="t-text whitespace-pre-wrap break-words font-normal">{{ c.content.problem }}</div>
                  </div>
                  <div v-if="c.content?.proposal">
                    <div class="font-bold" :class="theme === 'dark' ? 'text-[#00ad50]' : 'text-[#4fd1c5]'">Proposal</div>
                    <div class="t-text whitespace-pre-wrap break-words font-normal">{{ c.content.proposal }}</div>
                  </div>
                  <div v-if="c.content?.impact">
                    <div class="font-bold" :class="theme === 'dark' ? 'text-[#00ad50]' : 'text-[#4fd1c5]'">Impact</div>
                    <div class="t-text whitespace-pre-wrap break-words font-normal">{{ c.content.impact }}</div>
                  </div>
                  <div v-if="c.content?.constraints">
                    <div class="font-bold" :class="theme === 'dark' ? 'text-[#00ad50]' : 'text-[#4fd1c5]'">Constraints</div>
                    <div class="t-text whitespace-pre-wrap break-words font-normal">{{ c.content.constraints }}</div>
                  </div>
                  <div v-if="Array.isArray(c.content?.owners) && c.content.owners.length">
                    <div class="font-bold" :class="theme === 'dark' ? 'text-[#00ad50]' : 'text-[#4fd1c5]'">Owner 후보</div>
                    <div class="t-text font-normal">{{ c.content.owners.join(", ") }}</div>
                  </div>
                  <div v-if="Array.isArray(c.content?.evidence) && c.content.evidence.length">
                    <div class="font-bold" :class="theme === 'dark' ? 'text-[#00ad50]' : 'text-[#4fd1c5]'">Evidence</div>
                    <ul class="t-text space-y-1 font-normal">
                      <li v-for="(e, idx) in c.content.evidence" :key="idx" class="break-words">
                        {{ e }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="insightsTab === 'graph'">
            <div v-if="graphError" class="mb-2 text-xs t-text-faint">에러: {{ graphError }}</div>
            <div v-if="graphLoading" class="text-xs t-text-subtle">그래프 로딩 중…</div>
            <div v-else-if="!graphData?.nodes?.length" class="text-xs t-text-subtle">
              아직 그래프를 만들 정보가 부족합니다. 카드(특히 AI 주간 카드)가 생기면 연결이 만들어집니다.
            </div>
            <svg
              v-else
              :width="graphSvgSize"
              :height="graphSvgSize"
              class="w-full max-w-[1500px] mx-auto rounded border t-border"
              viewBox="0 0 560 560"
            >
              <g>
                <line
                  v-for="e in graphData.edges"
                  :key="e.id"
                  :x1="nodePos(e.source).x"
                  :y1="nodePos(e.source).y"
                  :x2="nodePos(e.target).x"
                  :y2="nodePos(e.target).y"
                  :stroke="theme === 'dark' ? '#555' : '#E0E0E0'"
                  stroke-width="1.2"
                />
              </g>
              <g>
                <g v-for="n in graphData.nodes" :key="n.id">
                  <circle
                    :cx="nodePos(n.id).x"
                    :cy="nodePos(n.id).y"
                    :r="n.type === 'room' ? 26 : n.type === 'card' ? 16 : 12"
                    :fill="n.type === 'room' ? '#00694D' : n.type === 'card' ? '#C2D6BE' : (theme === 'dark' ? '#000000' : '#FFFFFF')"
                    :stroke="n.type === 'room' ? '#00694D' : '#B7B7B7'"
                    stroke-width="1.2"
                  />
                  <text
                    :x="nodePos(n.id).x"
                    :y="nodePos(n.id).y + (n.type === 'room' ? 5 : 30)"
                    text-anchor="middle"
                    fill="currentColor"
                    :class="n.type === 'room' ? 'text-white' : (theme === 'dark' ? 'text-yellow-500' : 'text-black')"
                    font-size="12"
                    font-family="Pretendard, Noto Sans, Arial"
                    :title="n.label"
                  >
                    <!-- {{ n.label.length > 10 ? n.label.slice(0, 10) + "…" : n.label }} -->
                    {{ n.label.length > 20 ? n.label.slice(0, 10) + "…" : n.label }}  
                  </text>
                </g>
              </g>
            </svg>
          </div>

          <div v-else-if="insightsTab === 'pulse'" class="space-y-4">
            <div v-if="pulseError" class="mb-2 text-xs t-text-faint">에러: {{ pulseError }}</div>
            <div v-if="!pulseReport" class="rounded border t-border t-surface p-4 text-center">
              <p class="text-xs t-text-subtle mb-3">
                '{{ store.activeRoom?.title || "이 채팅방" }}' 채팅방의 아이디어 카드·지식 그래프·채팅을 AI가 분석해 사람, 채팅, 문서, 태스크, 아이디어, 문제 제기, 불만, 기술 이슈, 결정 사항으로 정리하고 인텔리전스 제안을 생성합니다.
              </p>
              <button
                type="button"
                class="px-4 py-2 text-sm rounded t-btn-primary inline-flex items-center gap-2"
                :disabled="pulseLoading"
                @click="runGeneratePulseReport"
              >
                <svg
                  v-if="pulseLoading"
                  class="animate-spin shrink-0"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-opacity="0.25"
                  />
                  <path
                    d="M12 2a10 10 0 0 1 10 10"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
                <span>{{ pulseLoading ? "리포트 생성 중…" : "Pulse 리포트 생성하기" }}</span>
              </button>
            </div>
            <div v-else class="rounded border t-border t-surface overflow-hidden">
              <div
                class="px-4 py-3 border-b t-border"
                :class="theme === 'dark' ? 'bg-[#252525]' : 'bg-[#f3f3f3]'"
              >
                <h3 class="text-base font-bold t-text">Brain Pulse 리포트</h3>
                <p class="text-xs t-text-subtle mt-0.5">{{ formatPulseGeneratedAt(pulseReport.generatedAt) }}</p>
              </div>
              <div class="p-4 space-y-4">
                <section>
                  <h4 class="text-sm font-semibold t-text mb-1">요약</h4>
                  <p class="text-sm t-text-subtle whitespace-pre-wrap">{{ pulseReport.summary }}</p>
                </section>
                <template v-for="key in pulseSectionOrder" :key="key">
                  <section v-if="pulseReport.sections[key]" class="border-t t-border pt-3">
                    <h4 class="text-sm font-semibold t-text mb-1">{{ pulseSectionLabels[key] }}</h4>
                    <p class="text-sm t-text-subtle whitespace-pre-wrap">{{ pulseReport.sections[key] }}</p>
                  </section>
                </template>
                <section v-if="pulseReport.aiSuggestions?.length" class="border-t t-border pt-3">
                  <h4 class="text-sm font-semibold text-[#00694D] mb-2">AI 인텔리전스 제안</h4>
                  <ul class="space-y-1.5">
                    <li
                      v-for="(s, i) in pulseReport.aiSuggestions"
                      :key="i"
                      class="text-sm t-text-subtle flex gap-2"
                    >
                      <span class="text-[#00AD50] font-medium shrink-0">{{ i + 1 }}.</span>
                      <span>{{ s }}</span>
                    </li>
                  </ul>
                </section>
              </div>
              <div class="px-4 py-3 border-t t-border flex flex-wrap items-center justify-end gap-2" :class="theme === 'dark' ? 'bg-[#252525]' : 'bg-[#f3f3f3]'">
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs rounded t-btn-secondary"
                  @click="runGeneratePulseReport"
                  :disabled="pulseLoading"
                >
                  {{ pulseLoading ? "생성 중…" : "다시 생성" }}
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs rounded t-btn-primary"
                  :disabled="pulseLoading"
                  @click="generateSpecPacketAndDocs"
                >
                  Spec Packet(JSON) + 문서(MD)로 받기
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs rounded t-btn-secondary"
                  :disabled="!specResult || downloadZipLoading"
                  @click="downloadZip"
                >
                  {{ downloadZipLoading ? "다운로드 중…" : "다운로드(.zip)" }}
                </button>
              </div>
            </div>
          </div>

          <!-- Spec Packet + 문서 미리보기 모달 -->
          <CommonModal
            :open="specModalOpen"
            title="Spec Packet & 문서 미리보기"
            panel-class="max-w-4xl"
            @close="specModalOpen = false"
          >
            <div v-if="specResult" class="space-y-3">
              <div v-if="!specValidation.valid" class="flex items-center gap-2 rounded border border-[#FB4F4F] bg-[#FB4F4F]/10 px-3 py-2 text-sm text-[#FB4F4F]">
                <span class="font-semibold">스키마 경고:</span>
                <span>필수 키 누락: {{ specValidation.missingKeys.join(", ") }}</span>
              </div>
              <div class="flex flex-wrap gap-1 border-b t-border pb-2">
                <button
                  v-for="t in specPreviewTabs"
                  :key="t.id"
                  type="button"
                  class="px-2.5 py-1.5 text-xs rounded"
                  :class="specPreviewTab === t.id ? 't-btn-primary' : 't-btn-secondary'"
                  @click="specPreviewTab = t.id"
                >
                  {{ t.label }}
                </button>
              </div>
              <div class="min-h-[320px] max-h-[60vh] overflow-auto rounded border t-border bg-[#FBFBFB] p-3 text-left text-black">
                <pre v-if="specPreviewTab === 'json'" class="text-xs whitespace-pre-wrap break-all">{{ specPreviewContent }}</pre>
                <pre v-else class="text-xs whitespace-pre-wrap">{{ specPreviewContent }}</pre>
              </div>

              <!-- 프로젝트 자동 생성 (Claude Code) - Electron 전용 -->
              <div v-if="isDesktop" class="border-t t-border pt-3 mt-3 space-y-2">
                <h4 class="text-sm font-semibold t-text">프로젝트 자동 생성 (Claude Code)</h4>
                <p class="text-xs t-text-subtle">
                  Spec을 작업 디렉터리(~\/dw-brain/generated)에 저장한 뒤 Claude Code CLI로 프로젝트를 생성합니다.
                </p>
                <div v-if="!claudeCliChecked" class="text-xs t-text-subtle">Claude CLI 확인 중…</div>
                <div v-else-if="!claudeCliAvailable" class="rounded border border-[#FB4F4F]/50 bg-[#FB4F4F]/10 px-3 py-2 text-xs text-[#FB4F4F]">
                  <p class="font-medium">Claude Code CLI가 설치되어 있지 않습니다.</p>
                  <p class="mt-1">설치: <a href="https://code.claude.com/docs/en/quickstart" target="_blank" rel="noopener" class="underline">Claude Code 설치 가이드</a>에서 CLI를 설치한 뒤 다시 시도하세요.</p>
                </div>
                <template v-else>
                  <div class="flex flex-wrap gap-2">
                    <button
                      type="button"
                      class="px-3 py-1.5 text-xs rounded t-btn-primary"
                      :disabled="claudeCodeRunning"
                      @click="runClaudeCodeProjectGenerate"
                    >
                      <span v-if="claudeCodeRunning">생성 중…</span>
                      <span v-else>프로젝트 자동 생성(Claude Code)</span>
                    </button>
                  </div>
                  <div v-if="claudeCodeRunning || claudeCodeLogs.length" class="rounded border t-border bg-[#0a0a0a] p-2 max-h-[200px] overflow-auto">
                    <pre class="text-xs text-[#e0e0e0] whitespace-pre-wrap break-all font-mono">{{ claudeCodeLogs }}</pre>
                  </div>
                  <div v-if="claudeCodeError" class="text-xs text-[#FB4F4F]">{{ claudeCodeError }}</div>
                  <div v-if="generatedProjectPath" class="rounded border t-border bg-[#FBFBFB] p-3 text-xs space-y-2">
                    <p class="t-text font-medium">생성 완료</p>
                    <p class="t-text-subtle break-all">{{ generatedProjectPath }}</p>
                    <div class="flex gap-2">
                      <button type="button" class="px-2.5 py-1.5 text-xs rounded t-btn-secondary" @click="openGeneratedFolder">폴더 열기</button>
                      <button type="button" class="px-2.5 py-1.5 text-xs rounded t-btn-secondary" @click="openInVSCode">VSCode로 열기</button>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </CommonModal>
        </div>
      </template>
    </div>

    <div v-if="activePane === 'chat'" class="border-t t-border t-surface" :class="isMiniMode ? 'p-2' : 'p-3'">
      <div v-if="!isMiniMode" class="mb-2 flex items-center gap-3">
        <button
          class="px-3 py-2 text-sm rounded t-btn-secondary inline-flex items-center gap-2"
          :class="isListening ? 't-btn-primary' : ''"
          type="button"
          title="클릭하시면 화자구분 없이 회의내용을 실시간으로 임시저장하고 한번 더 클릭시 AI 질문/요청 건으로 자동으로 보내집니다."
          @click="toggleListening"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="shrink-0">
            <path
              d="M12 14a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v4a3 3 0 0 0 3 3Z"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M19 11a7 7 0 0 1-14 0"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M12 18v3"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M8 21h8"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span class="whitespace-nowrap">{{ isListening ? "경청 중" : "경청하기" }}</span>
          <span v-if="isListening" class="inline-flex items-end gap-0.5 h-4 ml-1">
            <span
              v-for="i in 5"
              :key="i"
              class="w-1 rounded-sm"
              :style="{
                height: micBarHeight(i),
                background: 'currentColor',
                opacity: 0.9
              }"
            />
          </span>
        </button>

        <button
          class="px-3 py-2 text-sm rounded t-btn-secondary inline-flex items-center gap-2"
          :class="isTranslateOn ? 't-btn-primary' : ''"
          type="button"
          :title="`실시간 번역 (${translateTargetLang})`"
          @click="toggleTranslate"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="shrink-0">
            <path
              d="M4 5h8M8 5v2m0 0c0 4-2 7-4 9m4-9c0 4 2 7 4 9"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M14 19h6m-3-9 3 9m-6 0 3-9"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span class="whitespace-nowrap">{{ isTranslateOn ? "번역 중" : "실시간 번역" }}</span>
        </button>

        <select
          v-model="translateTargetLang"
          class="h-9 px-2 text-sm rounded t-input t-input-strong"
          title="번역 언어 선택"
          aria-label="번역 언어 선택"
        >
          <option value="ko">ko</option>
          <option value="en">en</option>
        </select>

        <div class="flex items-center gap-3 ml-auto w-[46%] max-w-[560px] min-w-[320px]">
          <div class="text-xs t-text-subtle shrink-0">Opacity</div>
          <input
            v-model.number="chatOpacity"
            type="range"
            min="0"
            max="1"
            step="0.05"
            class="flex-1 chat-opacity-range"
            aria-label="채팅 투명도 조절"
          />
          <div class="text-xs t-text-muted w-10 text-right tabular-nums">{{ Math.round(chatOpacity * 100) }}%</div>
          <button
            class="px-2 py-1 text-xs rounded t-btn-secondary"
            title="투명도 초기화"
            @click="resetOpacity"
          >
            Reset
          </button>
        </div>
      </div>
      <div class="flex gap-2">
        <div
          class="relative flex-1 flex gap-2 composer-drop"
          :class="composerDragActive ? 'composer-drop-active' : ''"
          @dragenter.prevent="onComposerDragEnter"
          @dragover.prevent="onComposerDragOver"
          @dragleave.prevent="onComposerDragLeave"
          @drop.prevent="onComposerDrop"
        >
          <div v-if="composerDragActive" class="composer-drop-overlay" aria-hidden="true">
            <div class="composer-drop-overlay-inner">여기에 놓으면 자동 첨부됩니다</div>
          </div>
          <input
            v-model="text"
            ref="textInput"
            class="flex-1 px-3 py-2 text-sm rounded t-input"
            placeholder="메시지 입력 (예: 자비스야 궁금하다 ...)"
            @keydown.enter="send"
            @keydown.esc="closeAllComposerPopovers"
          />
          <button
            ref="attachButton"
            type="button"
            class="h-10 w-10 inline-flex items-center justify-center rounded t-btn-secondary shrink-0"
            title="첨부"
            aria-label="첨부 열기"
            @click="toggleAttachMenu"
          >
            <span class="text-xl leading-none">+</span>
          </button>
          <button
            ref="emojiButton"
            type="button"
            class="h-10 w-10 inline-flex items-center justify-center rounded t-btn-secondary shrink-0"
            title="이모티콘"
            aria-label="이모티콘 열기"
            @click="toggleEmojiPicker"
          >
            <span class="text-lg leading-none">😊</span>
          </button>

          <input ref="imageInput" class="hidden" type="file" accept="image/*" multiple @change="onPickImages" />
          <input ref="fileInput" class="hidden" type="file" multiple @change="onPickFiles" />

          <div
            v-if="attachOpen"
            ref="attachPopover"
            class="attach-popover absolute bottom-full mb-2 right-0 w-[220px] max-w-[80vw] rounded border t-border t-surface shadow-lg p-2"
          >
            <div class="flex items-center justify-between gap-2 mb-2">
              <div class="text-xs t-text-muted">첨부</div>
              <button type="button" class="px-2 py-1 text-xs rounded t-btn-secondary" @click="closeAttachMenu">
                닫기
              </button>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <button type="button" class="attach-action" @click="openImagePicker">이미지</button>
              <button type="button" class="attach-action" @click="openFilePicker">파일</button>
            </div>
            <div class="mt-2 text-[11px] t-text-subtle">전송하면 채팅에 미리보기가 표시됩니다. (파일 크기 제한 있음)</div>
          </div>

          <div
            v-if="emojiOpen"
            ref="emojiPopover"
            class="emoji-popover absolute bottom-full mb-2 left-0 w-[320px] max-w-[80vw] rounded border t-border t-surface shadow-lg p-2"
          >
            <div class="flex items-center justify-between gap-2 mb-2">
              <div class="text-xs t-text-muted">이모티콘</div>
              <button
                type="button"
                class="h-7 w-7 inline-flex items-center justify-center rounded t-btn-secondary"
                title="닫기"
                aria-label="닫기"
                @click="closeEmojiPicker"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M18 6L6 18"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M6 6l12 12"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span class="sr-only">닫기</span>
              </button>
            </div>

            <div v-if="recentEmojis.length" class="mb-2">
              <div class="text-[11px] t-text-subtle mb-1">최근</div>
              <div class="flex flex-wrap gap-1">
                <button
                  v-for="e in recentEmojis"
                  :key="'recent:' + e"
                  type="button"
                  class="emoji-chip"
                  @click="pickEmoji(e)"
                >
                  {{ e }}
                </button>
              </div>
            </div>

            <div class="text-[11px] t-text-subtle mb-1">전체</div>
            <div class="emoji-grid t-scrollbar">
              <button v-for="e in EMOJIS" :key="e" type="button" class="emoji-chip" @click="pickEmoji(e)">
                {{ e }}
              </button>
            </div>
          </div>
        </div>
        <div class="relative shrink-0 flex items-center gap-2">
          <button
            type="button"
            class="h-10 inline-flex items-center justify-center rounded t-btn-secondary shrink-0"
            :class="isMiniMode ? 'w-10' : 'w-20'"
            title="메시지 전송"
            aria-label="메시지 전송"
            @click="send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M22 2L11 13"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M22 2L15 22l-4-9-9-4 20-7z"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            ref="jarvisButton"
            type="button"
            class="h-10 w-10 inline-flex items-center justify-center rounded t-btn-primary shrink-0"
            title="AI에게 질문/요청 하기"
            aria-label="AI에게 질문/요청 하기"
            @click="askJarvisQuick"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="3" r="1" fill="currentColor" />
              <path
                d="M12 4v2"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <rect
                x="6"
                y="6"
                width="12"
                height="12"
                rx="3"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path d="M10 12h.01" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" />
              <path d="M14 12h.01" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" />
              <path
                d="M9 15h6"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>

          <div
            v-if="jarvisPopoverOpen"
            ref="jarvisPopover"
            class="jarvis-popover absolute bottom-full mb-2 right-0 w-[440px] max-w-[92vw] rounded border t-border t-surface shadow-lg p-3"
            @pointerdown.stop
          >
            <div class="flex items-center justify-between gap-2 mb-2">
              <div class="text-xs t-text-muted">AI 질문 및 요청</div>
              <button
                type="button"
                class="h-7 w-7 inline-flex items-center justify-center rounded t-btn-secondary"
                title="닫기"
                aria-label="닫기"
                @click="closeJarvisPopover"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M18 6L6 18"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M6 6l12 12"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span class="sr-only">닫기</span>
              </button>
            </div>

            <div v-if="currentJarvisContexts.length" class="mb-2 space-y-2">
              <div class="flex items-center justify-between gap-2">
                <div class="text-[11px] t-text-subtle">선택 메시지 ({{ currentJarvisContexts.length }})</div>
                <button
                  type="button"
                  class="px-2 py-1 text-[11px] rounded t-btn-secondary shrink-0"
                  @click="clearCurrentRoomJarvisContexts"
                >
                  전체 해제
                </button>
              </div>

              <div class="jarvis-context-list t-scrollbar">
                <div
                  v-for="c in currentJarvisContexts"
                  :key="c.key"
                  class="jarvis-context-item p-2 rounded border t-border t-row cursor-pointer"
                  role="button"
                  tabindex="0"
                  @click="onJarvisContextClick(c.content)"
                  @keydown.enter="onJarvisContextClick(c.content)"
                  @keydown.space.prevent="onJarvisContextClick(c.content)"
                >
                  <div class="flex items-center justify-between gap-2">
                    <div class="text-[11px] t-text-subtle truncate">{{ c.label }} · {{ c.time }}</div>
                    <button
                      type="button"
                      class="px-2 py-1 text-[11px] rounded t-btn-secondary shrink-0"
                      @click.stop="removeCurrentRoomJarvisContext(c.key)"
                    >
                      해제
                    </button>
                  </div>
                  <div class="mt-1 text-xs t-text-muted jarvis-context-preview">
                    {{ c.content }}
                  </div>
                </div>
              </div>
            </div>

            <textarea
              v-model="jarvisPrompt"
              ref="jarvisPopoverTextarea"
              class="w-full min-h-[92px] px-3 py-2 text-sm rounded t-input"
              placeholder="예: 이 메시지 원인 분석해줘 / 다음 액션 아이템 뽑아줘..."
            />

            <div class="mt-2 space-y-1">
              <div class="flex items-center justify-between gap-2">
                <div class="text-xs t-text-muted">자주 묻는 질문</div>
                <div class="text-[11px] t-text-subtle">좌우로 드래그</div>
              </div>
              <div
                ref="jarvisSuggestionsRow"
                class="flex items-center gap-2 overflow-x-auto flex-nowrap py-1 -mx-1 px-1 cursor-grab active:cursor-grabbing t-scrollbar t-dragscroll-x"
                @pointerdown="onJarvisSuggestionsPointerDown"
                @pointermove="onJarvisSuggestionsPointerMove"
                @pointerup="onJarvisSuggestionsPointerUp"
                @pointercancel="onJarvisSuggestionsPointerUp"
              >
                <button
                  v-for="s in jarvisSuggestions"
                  :key="s.key"
                  type="button"
                  class="text-[12px] px-3 py-1.5 rounded-full border t-chip whitespace-nowrap"
                  @click="onJarvisSuggestionClick(s.prompt, $event)"
                >
                  #{{ s.label }}
                </button>
              </div>
            </div>

            <!-- 개인 질문 시에만 표시: 팝업 내 답변 영역 -->
            <div
              v-if="store.personalJarvisRequestId || store.personalJarvisContent"
              class="mt-3 rounded border t-border t-row overflow-hidden flex flex-col"
            >
              <div class="text-[11px] t-text-subtle mb-1.5 px-3 pt-3 shrink-0">개인 질문 답변</div>
              <div
                class="px-3 pb-3 min-h-0 overflow-y-auto t-scrollbar text-sm"
                style="max-height: 4.5rem; line-height: 1.5"
              >
                <div
                  v-if="store.personalJarvisRequestId && !store.personalJarvisContent"
                  class="text-sm t-text-muted"
                >
                  답변 생성 중...
                </div>
                <div
                  v-else
                  class="text-sm t-text-muted whitespace-pre-wrap break-words"
                >
                  {{ store.personalJarvisContent }}
                </div>
              </div>
            </div>

            <div class="mt-3 flex items-center justify-end gap-2">
              <button type="button" class="px-3 py-2 text-sm rounded t-btn-secondary" @click="closeJarvisPopover">
                취소
              </button>
              <button type="button" class="px-3 py-2 text-sm rounded t-btn-secondary" @click="submitJarvisShared">
                공유 질문
              </button>
              <button type="button" class="px-3 py-2 text-sm rounded t-btn-primary" @click="submitJarvisPersonal">
                개인 질문
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="pendingAttachments.length" class="mt-2 flex flex-wrap gap-2">
        <div
          v-for="a in pendingAttachments"
          :key="a.id"
          class="attach-chip inline-flex items-center gap-2 px-2 py-1 rounded border t-border"
        >
          <img
            v-if="a.kind === 'image' && a.url"
            :src="a.url"
            alt=""
            class="w-7 h-7 rounded object-cover border t-border"
          />
          <span v-else class="text-sm leading-none">📎</span>
          <span class="text-xs t-text-muted max-w-[220px] truncate">{{ a.file.name }}</span>
          <button type="button" class="attach-remove" title="삭제" aria-label="첨부 삭제" @click="removeAttachment(a.id)">
            ×
          </button>
        </div>
      </div>
      <div v-if="!isMiniMode" class="mt-2 flex items-center gap-2 text-xs t-text-muted">
        <span>트리거: 메시지가 '자비스야'로 시작하면 자동 호출</span>
      </div>
    </div>
  </div>

  <CommonModal :open="jarvisOpen" title="자비스에게 질문" @close="closeJarvis">
    <div class="space-y-3">
      <div class="text-xs t-text-muted">질문 및 요청</div>
      <textarea
        v-model="jarvisPrompt"
        ref="jarvisTextarea"
        class="w-full min-h-[120px] px-3 py-2 text-sm rounded t-input"
        placeholder="예: 이 에러 로그 원인 분석해줘..."
      />

      <div class="space-y-1">
        <div class="flex items-center justify-between gap-2">
          <div class="text-xs t-text-muted">자주 묻는 질문</div>
          <div class="text-[11px] t-text-subtle">좌우로 드래그</div>
        </div>
        <div
          ref="jarvisSuggestionsRow"
          class="flex items-center gap-2 overflow-x-auto flex-nowrap py-1 -mx-1 px-1 cursor-grab active:cursor-grabbing t-scrollbar t-dragscroll-x"
          @pointerdown="onJarvisSuggestionsPointerDown"
          @pointermove="onJarvisSuggestionsPointerMove"
          @pointerup="onJarvisSuggestionsPointerUp"
          @pointercancel="onJarvisSuggestionsPointerUp"
        >
          <button
            v-for="s in jarvisSuggestions"
            :key="s.key"
            type="button"
            class="text-[12px] px-3 py-1.5 rounded-full border t-chip whitespace-nowrap"
            @click="onJarvisSuggestionClick(s.prompt, $event)"
          >
            #{{ s.label }}
          </button>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button class="px-3 py-2 text-sm rounded t-btn-secondary" @click="closeJarvis">취소</button>
        <button class="px-3 py-2 text-sm rounded t-btn-primary" @click="submitJarvisShared">
          공유 질문
        </button>
      </div>
    </template>
  </CommonModal>

  <CommonModal :open="inviteOpen" title="동료 초대" @close="closeInvite">
    <div class="space-y-3">
      <div class="space-y-1">
        <div class="text-xs t-text-muted">검색</div>
        <input
          v-model="inviteQuery"
          class="w-full px-3 py-2 text-sm rounded t-input"
          placeholder="이름/팀/태그로 검색"
        />
      </div>

      <div class="max-h-[360px] overflow-auto rounded border t-border t-scrollbar">
        <label
          v-for="c in filteredColleagues"
          :key="c.id"
          class="flex items-center gap-3 px-3 py-2 cursor-pointer border-b t-border last:border-b-0 t-row"
        >
          <input
            v-model="selectedColleagueIds"
            class="t-accent"
            type="checkbox"
            :value="c.id"
            :disabled="c.id === store.user?.id"
            :title="c.id === store.user?.id ? '본인은 초대할 수 없습니다.' : ''"
          />

          <div class="relative">
            <div class="w-10 h-10 rounded-full t-avatar flex items-center justify-center text-xs">
              {{ c.name.slice(0, 1) }}
            </div>
            <div
              class="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full border t-border"
              :class="c.isOnline ? 'bg-emerald-500' : 'bg-red-500'"
              :title="c.isOnline ? '로그인중' : '로그아웃됨'"
              aria-label="online-status"
            />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 min-w-0">
              <div class="text-xs t-text-muted truncate">{{ c.team || c.email }}</div>
              <div class="text-sm font-medium truncate">{{ c.name }}</div>
              <div v-if="c.role" class="text-xs t-text-subtle shrink-0">{{ c.role }}</div>
            </div>
            <div class="mt-1 flex flex-wrap gap-1">
              <span
                v-for="t in c.tags"
                :key="t"
                class="text-[11px] px-2 py-0.5 rounded-full border t-chip"
              >
                {{ t }}
              </span>
            </div>
          </div>
        </label>

        <div v-if="inviteErrorText" class="p-3 text-xs text-[#FB4F4F]">
          {{ inviteErrorText }}
        </div>
        <div v-else-if="inviteLoading" class="p-3 text-xs t-text-subtle">불러오는 중...</div>
        <div v-else-if="!filteredColleagues.length" class="p-3 text-xs t-text-subtle">
          동료가 없습니다. (다른 계정으로 한 번 로그인하면 목록에 표시됩니다)
        </div>
      </div>
    </div>
    <template #footer>
      <div class="flex items-center justify-between gap-2">
        <div class="text-xs t-text-subtle">선택: {{ selectedColleagueIds.length }}명</div>
        <div class="flex items-center gap-2">
          <button class="px-3 py-2 text-sm rounded t-btn-secondary" @click="closeInvite">취소</button>
          <button
            class="px-3 py-2 text-sm rounded t-btn-primary disabled:opacity-50"
            :disabled="selectedColleagueIds.length === 0"
            @click="submitInvite"
          >
            초대하기
          </button>
        </div>
      </div>
    </template>
  </CommonModal>

  <CommonModal :open="newsPopupOpen" title="오늘의 채팅방 주제 관련 뉴스" @close="closeNewsPopup">
    <div class="space-y-3">
      <p class="text-xs t-text-muted">
        채팅방 주제({{ store.activeRoom?.title ?? "이 방" }})를 기준으로 검색한 최신 뉴스입니다.
      </p>
      <div v-if="roomNewsLoading" class="py-6 text-center text-sm t-text-subtle">뉴스를 불러오는 중…</div>
      <div v-else-if="roomNewsError" class="py-4 text-center text-sm text-[#FB4F4F]">{{ roomNewsError }}</div>
      <div v-else-if="!roomNewsItems.length" class="py-6 text-center text-sm t-text-subtle">
        현재 주제와 관련된 최신 뉴스가 없습니다.
      </div>
      <div v-else class="space-y-3">
        <a
          v-for="(item, idx) in roomNewsItems"
          :key="idx"
          :href="item.link"
          target="_blank"
          rel="noopener noreferrer"
          class="block rounded-lg border t-border t-surface p-3 text-left hover:border-[#00AD50] transition-colors cursor-pointer"
        >
          <div class="text-sm font-bold truncate" :class="theme === 'dark' ? 'text-white' : 'text-[#262626]'">
            {{ item.title }}
          </div>
          <div v-if="item.description" class="mt-1 text-xs t-text line-clamp-2">{{ item.description }}</div>
          <div class="mt-1.5 text-[11px] t-text-muted">{{ formatNewsDate(item.pubDate) }}</div>
        </a>
      </div>
    </div>
  </CommonModal>

  <CommonModal :open="pastMeetingImportOpen" title="지난 회의록 가져오기" @close="closePastMeetingImport">
    <div class="space-y-3">
      <div class="text-xs t-text-muted">
        참여했던 채팅방 중 하나를 선택하면, 해당 방의 최근 약 1주일 메시지를 요약(요약/주요결정/미해결논의)해 현재 방에 AI 메시지로 올립니다.
      </div>
      <div class="max-h-[320px] overflow-auto rounded border t-border t-scrollbar">
        <label
          v-for="r in pastMeetingRooms"
          :key="r.id"
          class="flex items-center gap-3 px-3 py-2 cursor-pointer border-b t-border last:border-b-0 t-row"
          :class="selectedSourceRoomId === r.id ? 't-row-active' : ''"
        >
          <input
            v-model="selectedSourceRoomId"
            type="radio"
            name="past-meeting-room"
            class="t-accent"
            :value="r.id"
          />
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium truncate" :class="theme === 'dark' ? 'text-white' : 'text-black'">{{ r.title }}</div>
            <div class="text-xs t-text-subtle">{{ formatPastMeetingTime(r.lastMessageAt ?? r.createdAt) }}</div>
          </div>
        </label>
        <div v-if="pastMeetingError" class="p-3 text-xs text-[#FB4F4F]">
          {{ pastMeetingError }}
        </div>
        <div v-else-if="!pastMeetingRooms.length" class="p-3 text-xs t-text-subtle">
          현재 방을 제외한 참여 중인 다른 채팅방이 없습니다.
        </div>
      </div>
    </div>
    <template #footer>
      <div class="flex items-center justify-between gap-2">
        <div class="text-xs t-text-subtle">선택한 방의 최근 1주일 분량을 요약해 이 방에 올립니다.</div>
        <div class="flex items-center gap-2">
          <button class="px-3 py-2 text-sm rounded t-btn-secondary" @click="closePastMeetingImport">취소</button>
          <button
            class="px-3 py-2 text-sm rounded t-btn-primary disabled:opacity-50"
            :disabled="!selectedSourceRoomId || pastMeetingLoading"
            @click="submitPastMeetingImport"
          >
            {{ pastMeetingLoading ? "요약 생성 중…" : "요약해서 가져오기" }}
          </button>
        </div>
      </div>
    </template>
  </CommonModal>

  <CommonModal :open="forwardMessageOpen" title="다른 채팅방으로 전달하기" @close="closeForwardMessage">
    <div class="space-y-3">
      <div class="text-xs t-text-muted">
        메시지를 전달할 채팅방을 선택한 뒤 전달하기를 누르세요.
      </div>
      <div class="max-h-[320px] overflow-auto rounded border t-border t-scrollbar">
        <label
          v-for="r in forwardRooms"
          :key="r.id"
          class="flex items-center gap-3 px-3 py-2 cursor-pointer border-b t-border last:border-b-0 t-row"
          :class="selectedForwardRoomId === r.id ? 't-row-active' : ''"
        >
          <input
            v-model="selectedForwardRoomId"
            type="radio"
            name="forward-room"
            class="t-accent"
            :value="r.id"
          />
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium truncate" :class="theme === 'dark' ? 'text-white' : 'text-black'">{{ r.title }}</div>
            <div class="text-xs t-text-subtle">{{ formatPastMeetingTime(r.lastMessageAt ?? r.createdAt) }}</div>
          </div>
        </label>
        <div v-if="!forwardRooms.length" class="p-3 text-xs t-text-subtle">
          현재 방을 제외한 다른 채팅방이 없습니다.
        </div>
      </div>
    </div>
    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button class="px-3 py-2 text-sm rounded t-btn-secondary" @click="closeForwardMessage">취소</button>
        <button
          class="px-3 py-2 text-sm rounded t-btn-primary disabled:opacity-50"
          :disabled="!selectedForwardRoomId"
          @click="submitForwardMessage"
        >
          전달하기
        </button>
      </div>
    </template>
  </CommonModal>

  <CommonModal :open="deleteConfirmOpen" title="메시지 삭제" @close="closeDeleteConfirm">
    <div class="text-sm">이 메시지를 삭제할까요?</div>
    <div class="mt-2 text-xs t-text-subtle">삭제 후에는 메시지가 “(삭제된 메시지)”로 표시됩니다.</div>
    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button class="px-3 py-2 text-sm rounded t-btn-secondary" @click="closeDeleteConfirm">취소</button>
        <button class="px-3 py-2 text-sm rounded t-btn-danger" @click="submitDeleteConfirm">
          삭제
        </button>
      </div>
    </template>
  </CommonModal>

  <CommonModal :open="renameRoomOpen" title="채팅방 이름 변경" @close="closeRenameRoom">
    <div class="space-y-2">
      <div class="text-xs t-text-muted">새 이름</div>
      <input
        v-model="renameRoomTitle"
        class="w-full px-3 py-2 text-sm rounded t-input"
        placeholder="예: Incident 대응"
        @keydown.enter="submitRenameRoom"
      />
    </div>
    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button class="px-3 py-2 text-sm rounded t-btn-secondary" @click="closeRenameRoom">취소</button>
        <button
          class="px-3 py-2 text-sm rounded t-btn-primary disabled:opacity-50"
          :disabled="!renameRoomTitle.trim().length"
          @click="submitRenameRoom"
        >
          저장
        </button>
      </div>
    </template>
  </CommonModal>

  <CommonModal :open="deleteRoomOpen" title="채팅방 삭제" @close="closeDeleteRoom">
    <div class="text-sm">이 채팅방을 삭제할까요?</div>
    <div class="mt-2 text-xs t-text-subtle">삭제하면 방/메시지가 모두 제거됩니다. (Owner만 가능)</div>
    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button class="px-3 py-2 text-sm rounded t-btn-secondary" @click="closeDeleteRoom">취소</button>
        <button class="px-3 py-2 text-sm rounded t-btn-danger" @click="submitDeleteRoom">
          삭제
        </button>
      </div>
    </template>
  </CommonModal>

  <!-- 메시지 우클릭 컨텍스트 메뉴: 확인완료 / 전달하기 -->
  <div
    v-if="contextMenuMessage"
    ref="contextMenuRef"
    class="fixed z-[100] min-w-[140px] rounded border t-border t-surface shadow-lg py-1"
    :style="{ left: contextMenuPos.x + 'px', top: contextMenuPos.y + 'px' }"
    @pointerdown.stop
  >
    <button
      type="button"
      class="w-full text-left px-3 py-2 text-sm rounded-none t-btn-secondary bg-transparent border-0 hover:t-row flex items-center gap-2"
      @click="markMessageConfirmed(contextMenuMessage)"
    >
      <span class="text-[#00CE7D]">✓</span>
      {{ isMessageConfirmed(contextMenuMessage) ? "확인완료 취소" : "확인완료" }}
    </button>
    <button
      type="button"
      class="w-full text-left px-3 py-2 text-sm rounded-none t-btn-secondary bg-transparent border-0 hover:t-row"
      @click="openForwardMessageModal(contextMenuMessage)"
    >
      전달하기
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useSessionStore } from "../stores/session";
import { useWindowStore } from "../stores/window";
import { getActiveTheme, type ThemeMode } from "../theme";
import { isJarvisTrigger, stripJarvisPrefix } from "@jarvis/shared";
import {
  createIdeaCard,
  deleteIdeaCard,
  fetchIdeaCards,
  fetchRoomGraph,
  generatePulseReport,
  getPulseReport,
  generateWeeklyIdeaCards,
  type IdeaCardDto,
  type PulseReportDto,
  fetchUsers,
  fetchRoomNews,
  importMeetingSummary,
  translateText,
  type RoomNewsItemDto
} from "../api/http";
import JSZip from "jszip";
import { pulseReportToSpecResult, validateSpecPacket, type SpecPacketResult } from "../utils/pulseToSpec";
import CommonModal from "./ui/CommonModal.vue";

const store = useSessionStore();
const windowStore = useWindowStore();
const isMiniMode = computed(() => windowStore.miniMode);
const theme = ref<ThemeMode>("dark");
let themeObserver: MutationObserver | null = null;
const text = ref("");
const textInput = ref<HTMLInputElement | null>(null);
const emojiOpen = ref(false);
const emojiPopover = ref<HTMLDivElement | null>(null);
const emojiButton = ref<HTMLButtonElement | null>(null);
const attachOpen = ref(false);
const attachPopover = ref<HTMLDivElement | null>(null);
const attachButton = ref<HTMLButtonElement | null>(null);
const imageInput = ref<HTMLInputElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const LS_RECENT_EMOJIS = "jarvis.desktop.recentEmojis";
const recentEmojis = ref<string[]>([]);
const isSending = ref(false);

// attachments are embedded into `content` string (server schema is string only)
const ATTACH_BLOCK_START = "[[jarvis_attachments_v1]]";
const ATTACH_BLOCK_END = "[[/jarvis_attachments_v1]]";
type ChatAttachmentPayload = {
  kind: "image" | "file";
  name: string;
  mime: string;
  size: number;
  dataUrl?: string;
};
type ParsedMessage = { text: string; attachments: ChatAttachmentPayload[]; block: string };
const parsedCache = new Map<string, ParsedMessage>();

function base64EncodeUtf8(s: string) {
  try {
    return btoa(unescape(encodeURIComponent(s)));
  } catch {
    return btoa(s);
  }
}
function base64DecodeUtf8(s: string) {
  try {
    return decodeURIComponent(escape(atob(s)));
  } catch {
    return atob(s);
  }
}

function splitContent(raw: string): ParsedMessage {
  const s = String(raw ?? "");
  if (!s) return { text: "", attachments: [], block: "" };
  const start = s.indexOf(ATTACH_BLOCK_START);
  if (start < 0) return { text: s, attachments: [], block: "" };
  const end = s.indexOf(ATTACH_BLOCK_END, start);
  if (end < 0) return { text: s, attachments: [], block: "" };

  const textPart = s.slice(0, start).trimEnd();
  const block = s.slice(start, end + ATTACH_BLOCK_END.length).trim();

  const lines = block
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  const b64 = lines.length >= 2 ? lines[1] : "";
  if (!b64) return { text: textPart, attachments: [], block };
  try {
    const json = base64DecodeUtf8(b64);
    const parsed = JSON.parse(json);
    const list = Array.isArray(parsed) ? parsed : [];
    const attachments: ChatAttachmentPayload[] = list
      .map((x: any) => ({
        kind: x?.kind === "image" ? "image" : "file",
        name: String(x?.name ?? ""),
        mime: String(x?.mime ?? "application/octet-stream"),
        size: Number(x?.size ?? 0) || 0,
        dataUrl: typeof x?.dataUrl === "string" ? x.dataUrl : undefined
      }))
      .filter((x) => !!x.name);
    return { text: textPart, attachments, block };
  } catch {
    return { text: textPart, attachments: [], block };
  }
}

function parseMessageContent(raw: string): ParsedMessage {
  const s = String(raw ?? "");
  const cached = parsedCache.get(s);
  if (cached) return cached;
  const parsed = splitContent(s);
  parsedCache.set(s, parsed);
  return parsed;
}

function parsedFor(m: any) {
  return parseMessageContent(String(m?.content ?? ""));
}

function plainTextFromContent(raw: string) {
  return parseMessageContent(String(raw ?? "")).text;
}

function formatBytes(n: number) {
  const v = Number(n) || 0;
  if (v <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let idx = 0;
  let cur = v;
  while (cur >= 1024 && idx < units.length - 1) {
    cur /= 1024;
    idx++;
  }
  const fixed = idx === 0 ? String(Math.round(cur)) : cur.toFixed(cur >= 10 ? 1 : 2);
  return `${fixed} ${units[idx]}`;
}

function buildAttachmentBlock(list: ChatAttachmentPayload[]) {
  if (!list.length) return "";
  const json = JSON.stringify(list);
  const b64 = base64EncodeUtf8(json);
  return `${ATTACH_BLOCK_START}\n${b64}\n${ATTACH_BLOCK_END}`;
}

function composeContent(text: string, list: ChatAttachmentPayload[]) {
  const t = String(text ?? "").trim();
  const block = buildAttachmentBlock(list);
  if (!t && block) return block;
  if (t && !block) return t;
  return `${t}\n\n${block}`;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("FILE_READ_FAILED"));
    r.onload = () => resolve(String(r.result ?? ""));
    r.readAsDataURL(file);
  });
}

// Insights (아이디어 카드 / 지식 그래프 / Brain Pulse 리포트)
type InsightsTab = "cards" | "graph" | "pulse";
const activePane = ref<"chat" | "insights">("chat");
const insightsTab = ref<InsightsTab>("cards");
const ideaCards = ref<IdeaCardDto[]>([]);
const ideaCardSaveNotification = ref<string | null>(null);
const cardsLoading = ref(false);
const cardsError = ref<string>("");

/** 동일 내용 카드 중복 제거: sourceMessageId 기준 또는 title+problem 정규화 문자열 기준으로 첫 항목만 유지 */
function dedupeIdeaCards(cards: IdeaCardDto[]): IdeaCardDto[] {
  const seen = new Set<string>();
  return cards.filter((c) => {
    const key = c.sourceMessageId
      ? `msg:${c.sourceMessageId}`
      : String(
          `${String(c?.title ?? "").trim()}\n${String((c?.content as any)?.problem ?? "").trim()}`
        )
          .replace(/\s+/g, " ")
          .trim() || `id:${c.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
const graphLoading = ref(false);
const graphError = ref<string>("");
const graphData = ref<{ roomId: string; weekStart: string | null; nodes: any[]; edges: any[] } | null>(null);
const graphSvgSize = 560;

const pulseReport = ref<PulseReportDto | null>(null);
const pulseLoading = ref(false);
const pulseError = ref<string>("");
const specResult = ref<SpecPacketResult | null>(null);
const specModalOpen = ref(false);
const specPreviewTab = ref<string>("json");
const specPreviewTabs = [
  { id: "json", label: "JSON" },
  { id: "PRD", label: "PRD" },
  { id: "UX_FLOW", label: "UX" },
  { id: "API_SPEC", label: "API" },
  { id: "DB_SCHEMA", label: "DB" },
  { id: "DECISIONS", label: "Decisions" }
];
const specValidation = computed(() =>
  specResult.value ? validateSpecPacket(specResult.value.specPacket) : { valid: true, missingKeys: [] }
);
const specPreviewContent = computed(() => {
  const r = specResult.value;
  if (!r) return "";
  if (specPreviewTab.value === "json") return JSON.stringify(r.specPacket, null, 2);
  return r.documents[specPreviewTab.value as keyof typeof r.documents] ?? "";
});
const downloadZipLoading = ref(false);
const isDesktop = typeof window !== "undefined" && !!(window as any).jarvisDesktop;

// Claude Code project generation (Electron only)
const claudeCliChecked = ref(false);
const claudeCliAvailable = ref(false);
const claudeCliVersion = ref<string | null>(null);
const claudeCodeRunning = ref(false);
const claudeCodeLogs = ref("");
const claudeCodeError = ref("");
const generatedProjectPath = ref("");
let claudeCodeUnsub: (() => void)[] = [];
/** 표시 순서: 전문 분석 리포트 11개 섹션 우선, 이후 레거시 섹션 */
const pulseSectionOrder: (keyof PulseReportDto["sections"])[] = [
  "executiveInsight",
  "problemDefinition",
  "causalAnalysis",
  "impactMatrix",
  "opportunities",
  "actionItems",
  "techConsiderations",
  "orgConsiderations",
  "riskAnalysis",
  "nextSteps",
  "people",
  "chat",
  "documents",
  "tasks",
  "ideas",
  "problems",
  "complaints",
  "techIssues",
  "decisions"
];
const pulseSectionLabels: Record<keyof PulseReportDto["sections"], string> = {
  executiveInsight: "Executive Insight (핵심 인사이트)",
  problemDefinition: "문제 정의",
  causalAnalysis: "원인 분석",
  impactMatrix: "영향도 매트릭스",
  opportunities: "기회 발굴",
  actionItems: "액션 아이템",
  techConsiderations: "기술적 고려사항",
  orgConsiderations: "조직적 고려사항",
  riskAnalysis: "리스크 분석 & 대응전략",
  nextSteps: "미해결 질문 / 다음 단계",
  people: "사람",
  chat: "채팅",
  documents: "문서",
  tasks: "태스크",
  ideas: "아이디어",
  problems: "문제 제기",
  complaints: "불만",
  techIssues: "기술 이슈",
  decisions: "결정 사항"
};

const graphPosById = computed<Record<string, { x: number; y: number }>>(() => {
  const g = graphData.value;
  const map: Record<string, { x: number; y: number }> = {};
  if (!g?.nodes?.length) return map;

  const cx = graphSvgSize / 2;
  const cy = graphSvgSize / 2;
  const room = g.nodes.find((n) => n.type === "room") ?? g.nodes[0];
  if (room) map[room.id] = { x: cx, y: cy };

  const cards = g.nodes.filter((n) => n.type === "card");
  const tags = g.nodes.filter((n) => n.type !== "room" && n.type !== "card");

  const placeRing = (nodes: any[], r: number, startAngle = -Math.PI / 2) => {
    const n = nodes.length;
    if (!n) return;
    for (let i = 0; i < n; i++) {
      const a = startAngle + (2 * Math.PI * i) / n;
      map[nodes[i].id] = { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    }
  };

  placeRing(tags, 165);
  placeRing(cards, 240);
  return map;
});

function nodePos(id: string) {
  return graphPosById.value[id] ?? { x: graphSvgSize / 2, y: graphSvgSize / 2 };
}

function weekStartIsoUtcFor(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // Mon=0 .. Sun=6
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString();
}

const insightsWeekStartIso = ref<string>(weekStartIsoUtcFor());

async function loadIdeaCards() {
  if (!store.token || !store.activeRoomId) return;
  cardsLoading.value = true;
  cardsError.value = "";
  try {
    ideaCards.value = dedupeIdeaCards(await fetchIdeaCards(store.token, store.activeRoomId, 120));
  } catch (e: any) {
    cardsError.value = e?.message ?? "카드 목록 로드 실패";
  } finally {
    cardsLoading.value = false;
  }
}

async function loadGraph() {
  if (!store.token || !store.activeRoomId) return;
  graphLoading.value = true;
  graphError.value = "";
  try {
    graphData.value = await fetchRoomGraph(store.token, store.activeRoomId, { weekStart: insightsWeekStartIso.value });
  } catch (e: any) {
    graphError.value = e?.message ?? "그래프 로드 실패";
    graphData.value = null;
  } finally {
    graphLoading.value = false;
  }
}

async function loadPulseReport() {
  if (!store.token || !store.activeRoomId) return;
  pulseError.value = "";
  try {
    const report = await getPulseReport(store.token, store.activeRoomId);
    pulseReport.value = report;
  } catch (e: any) {
    pulseError.value = e?.message ?? "리포트 로드 실패";
    pulseReport.value = null;
  }
}

async function refreshInsights() {
  await Promise.all([loadIdeaCards(), loadGraph(), loadPulseReport()]);
}

function toggleInsightsPane() {
  activePane.value = activePane.value === "chat" ? "insights" : "chat";
  if (activePane.value === "insights") refreshInsights();
}

function isMessageSavedAsCard(m: { id: string }) {
  return ideaCards.value.some((c) => c.sourceMessageId === m.id);
}

// 메시지 내용 검색: 하이라이트, 매치 목록, 이전/다음 이동
const messageEls = ref<Record<string, HTMLElement>>({});
const searchHighlightIndex = ref(0);

const messageSearchMatches = computed(() => {
  const q = (store.messageSearchQuery ?? "").trim().toLowerCase();
  if (!q) return [];
  const msgs = store.activeMessages;
  return msgs.filter((m: any) => String(m?.content ?? "").toLowerCase().includes(q)).map((m: any) => m.id);
});

function setMessageEl(id: string, el: any) {
  const target = Array.isArray(el) ? el[0] : el;
  if (target && typeof target === "object" && target instanceof HTMLElement) messageEls.value[id] = target;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeRegex(s: string): string {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightedMessageHtml(m: any): string {
  const text = String(parsedFor(m).text ?? "");
  const q = (store.messageSearchQuery ?? "").trim();
  if (!q) return escapeHtml(text);
  try {
    const re = new RegExp(escapeRegex(q).replace(/\s+/g, "\\s+"), "gi");
    let result = "";
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      result += escapeHtml(text.slice(lastIndex, match.index)) + '<mark class="bg-yellow-300 dark:bg-yellow-600/60 rounded px-0.5">' + escapeHtml(match[0]) + "</mark>";
      lastIndex = match.index + match[0].length;
    }
    result += escapeHtml(text.slice(lastIndex));
    return result;
  } catch {
    return escapeHtml(text);
  }
}

function scrollToSearchMatch(direction: 1 | -1) {
  const ids = messageSearchMatches.value;
  if (!ids.length) return;
  let next = searchHighlightIndex.value + direction;
  if (next < 0) next = ids.length - 1;
  if (next >= ids.length) next = 0;
  searchHighlightIndex.value = next;
  const id = ids[next];
  const el = messageEls.value[id];
  if (el) {
    nextTick(() => el.scrollIntoView({ behavior: "smooth", block: "center" }));
  }
}

watch(
  [messageSearchMatches, () => store.messageSearchQuery],
  () => {
    const ids = messageSearchMatches.value;
    if (ids.length && searchHighlightIndex.value >= ids.length) searchHighlightIndex.value = Math.max(0, ids.length - 1);
  },
  { flush: "post" }
);

async function saveMessageAsCard(m: any) {
  if (!store.token || !store.activeRoomId) return;
  const existing = ideaCards.value.find((c) => c.sourceMessageId === m.id);
  try {
    if (existing) {
      await deleteIdeaCard(store.token, store.activeRoomId, existing.id);
      ideaCards.value = ideaCards.value.filter((c) => c.id !== existing.id);
      if (insightsTab.value === "graph") loadGraph();
      ideaCardSaveNotification.value = "아이디어 카드에서 제거되었습니다";
    } else {
      const created = await createIdeaCard(store.token, store.activeRoomId, { sourceMessageId: m.id });
      ideaCards.value = dedupeIdeaCards([created, ...ideaCards.value.filter((c) => c.id !== created.id)]);
      ideaCardSaveNotification.value = "아이디어 카드에 저장되었습니다";
    }
    const t = setTimeout(() => {
      ideaCardSaveNotification.value = null;
      clearTimeout(t);
    }, 2500);
  } catch (e: any) {
    store.pushLocal(store.activeRoomId, {
      id: `sys:${Date.now()}`,
      roomId: store.activeRoomId,
      senderType: "system",
      senderUserId: null,
      content: existing
        ? `에러: 카드 제거 실패 (${e?.message ?? "UNKNOWN"})`
        : `에러: 카드 저장 실패 (${e?.message ?? "UNKNOWN"})`,
      createdAt: new Date().toISOString()
    } as any);
  }
}

async function removeCard(cardId: string) {
  if (!store.token || !store.activeRoomId) return;
  try {
    await deleteIdeaCard(store.token, store.activeRoomId, cardId);
    ideaCards.value = ideaCards.value.filter((c) => c.id !== cardId);
    // graph becomes stale; refresh lazily
    if (insightsTab.value === "graph") loadGraph();
  } catch (e: any) {
    cardsError.value = e?.message ?? "카드 삭제 실패";
  }
}

async function runWeeklyAiUpdate() {
  if (!store.token || !store.activeRoomId) return;
  cardsLoading.value = true;
  cardsError.value = "";
  try {
    await generateWeeklyIdeaCards(store.token, store.activeRoomId, { weekStart: insightsWeekStartIso.value });
    await refreshInsights();
  } catch (e: any) {
    cardsError.value = e?.message ?? "주간 업데이트 실패";
  } finally {
    cardsLoading.value = false;
  }
}

async function runGeneratePulseReport() {
  if (!store.token || !store.activeRoomId) return;
  pulseLoading.value = true;
  pulseError.value = "";
  try {
    pulseReport.value = await generatePulseReport(store.token, store.activeRoomId);
  } catch (e: any) {
    pulseError.value = e?.message ?? "리포트 생성 실패";
    pulseReport.value = null;
  } finally {
    pulseLoading.value = false;
  }
}

function formatPulseGeneratedAt(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

function generateSpecPacketAndDocs() {
  if (!pulseReport.value) return;
  specResult.value = pulseReportToSpecResult(pulseReport.value);
  specPreviewTab.value = "json";
  specModalOpen.value = true;
}

async function downloadZip() {
  const r = specResult.value;
  if (!r) return;
  downloadZipLoading.value = true;
  try {
    const zip = new JSZip();
    zip.file("specPacket.json", JSON.stringify(r.specPacket, null, 2));
    zip.file("PRD.md", r.documents.PRD);
    zip.file("UX_FLOW.md", r.documents.UX_FLOW);
    zip.file("API_SPEC.md", r.documents.API_SPEC);
    zip.file("DB_SCHEMA.md", r.documents.DB_SCHEMA);
    zip.file("DECISIONS.md", r.documents.DECISIONS);
    const blob = await zip.generateAsync({ type: "blob" });
    const arrayBuffer = await blob.arrayBuffer();

    if (isDesktop && (window as any).jarvisDesktop?.saveZip) {
      const result = await (window as any).jarvisDesktop.saveZip(arrayBuffer);
      if (result?.canceled) return;
    } else {
      const url = URL.createObjectURL(new Blob([arrayBuffer], { type: "application/zip" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "pulse-spec.zip";
      a.click();
      URL.revokeObjectURL(url);
    }
  } finally {
    downloadZipLoading.value = false;
  }
}

async function checkClaudeCliIfNeeded() {
  if (!isDesktop || !(window as any).jarvisDesktop?.checkClaudeCli) return;
  if (claudeCliChecked.value) return;
  try {
    const r = await (window as any).jarvisDesktop.checkClaudeCli();
    claudeCliAvailable.value = r?.available === true;
    claudeCliVersion.value = r?.version ?? null;
  } finally {
    claudeCliChecked.value = true;
  }
}

function runClaudeCodeProjectGenerate() {
  const r = specResult.value;
  if (!r || !isDesktop) return;
  const api = (window as any).jarvisDesktop;
  if (!api?.runClaudeCodeProjectGenerate) return;

  claudeCodeRunning.value = true;
  claudeCodeLogs.value = "";
  claudeCodeError.value = "";
  generatedProjectPath.value = "";

  const projectName = r.specPacket?.project?.name ?? "project";

  claudeCodeUnsub = [
    api.onClaudeCodeStdout((chunk: string) => {
      claudeCodeLogs.value += chunk;
    }),
    api.onClaudeCodeStderr((chunk: string) => {
      claudeCodeLogs.value += chunk;
    }),
    api.onClaudeCodeDone((data: { exitCode?: number; outPath?: string; error?: string }) => {
      claudeCodeRunning.value = false;
      claudeCodeUnsub.forEach((fn) => fn());
      claudeCodeUnsub = [];
      if (data?.outPath) generatedProjectPath.value = data.outPath;
      if (data?.error) claudeCodeError.value = data.error;
      if (data?.exitCode !== undefined && data.exitCode !== 0 && !data.error) {
        claudeCodeError.value = `종료 코드: ${data.exitCode}`;
      }
    })
  ];

  api.runClaudeCodeProjectGenerate({
    projectName,
    specPacket: r.specPacket,
    documents: r.documents
  }).catch((err: any) => {
    claudeCodeRunning.value = false;
    claudeCodeUnsub.forEach((fn) => fn());
    claudeCodeUnsub = [];
    claudeCodeError.value = err?.message ?? "실행 실패";
  });
}

function openGeneratedFolder() {
  const p = generatedProjectPath.value;
  if (!p || !isDesktop) return;
  (window as any).jarvisDesktop?.openGeneratedFolder?.(p);
}

function openInVSCode() {
  const p = generatedProjectPath.value;
  if (!p || !isDesktop) return;
  (window as any).jarvisDesktop?.openInVSCode?.(p);
}

watch(
  () => insightsTab.value,
  (t) => {
    if (activePane.value === "insights" && t === "graph") loadGraph();
  }
);

watch(
  () => store.activeRoomId,
  () => {
    pulseReport.value = null;
    pulseError.value = "";
    specResult.value = null;
    specModalOpen.value = false;
    generatedProjectPath.value = "";
    claudeCodeLogs.value = "";
    claudeCodeError.value = "";
    insightsWeekStartIso.value = weekStartIsoUtcFor();
    if (activePane.value === "insights") {
      refreshInsights();
    } else {
      // 새로고침 후 인사이트 열기 전에도 저장된 pulse 리포트 미리 로드 (같은 방이면 나중에 탭 전환 시 바로 표시)
      loadPulseReport();
    }
  }
);

watch(specModalOpen, (open) => {
  if (open && isDesktop) checkClaudeCliIfNeeded();
});

const EMOJIS = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "😅",
  "🤣",
  "😂",
  "🙂",
  "🙃",
  "😉",
  "😊",
  "😍",
  "😘",
  "😗",
  "😙",
  "😚",
  "😋",
  "😛",
  "😜",
  "🤪",
  "😎",
  "🤓",
  "🫡",
  "🤔",
  "🫢",
  "😮",
  "😴",
  "🤯",
  "😵‍💫",
  "😬",
  "😤",
  "😭",
  "😡",
  "🤝",
  "🙏",
  "👏",
  "🙌",
  "💪",
  "🧠",
  "🫀",
  "👀",
  "✅",
  "❌",
  "⚠️",
  "🔥",
  "💡",
  "🧩",
  "🧪",
  "🛠️",
  "🧰",
  "🧯",
  "📌",
  "📎",
  "📝",
  "📣",
  "📞",
  "⏰",
  "📅",
  "🔍",
  "🔗",
  "🧭",
  "🚨",
  "🆘",
  "📈",
  "📉",
  "🟢",
  "🟡",
  "🔴",
  "🧑‍💻",
  "🤖"
] as const;

function loadRecentEmojis() {
  try {
    const raw = localStorage.getItem(LS_RECENT_EMOJIS);
    if (!raw) return;
    const v = JSON.parse(raw);
    if (Array.isArray(v)) recentEmojis.value = v.filter((x) => typeof x === "string").slice(0, 24);
  } catch {
    // ignore
  }
}

function saveRecentEmojis() {
  try {
    localStorage.setItem(LS_RECENT_EMOJIS, JSON.stringify(recentEmojis.value.slice(0, 24)));
  } catch {
    // ignore
  }
}

function closeEmojiPicker() {
  emojiOpen.value = false;
}

function toggleEmojiPicker() {
  closeAttachMenu();
  emojiOpen.value = !emojiOpen.value;
}

function closeAttachMenu() {
  attachOpen.value = false;
}

function toggleAttachMenu() {
  closeEmojiPicker();
  attachOpen.value = !attachOpen.value;
}

function closeAllComposerPopovers() {
  closeEmojiPicker();
  closeAttachMenu();
  closeJarvisPopover();
}

function insertAtCursor(s: string) {
  const el = textInput.value;
  if (!el) {
    text.value = (text.value ?? "") + s;
    return;
  }
  const v = text.value ?? "";
  const start = el.selectionStart ?? v.length;
  const end = el.selectionEnd ?? v.length;
  const next = v.slice(0, start) + s + v.slice(end);
  text.value = next;
  nextTick(() => {
    el.focus();
    const pos = start + s.length;
    try {
      el.setSelectionRange(pos, pos);
    } catch {
      // ignore
    }
  });
}

function pushRecentEmoji(e: string) {
  const next = [e, ...recentEmojis.value.filter((x) => x !== e)].slice(0, 24);
  recentEmojis.value = next;
  saveRecentEmojis();
}

function pickEmoji(e: string) {
  insertAtCursor(e);
  pushRecentEmoji(e);
  closeEmojiPicker();
}

type PendingAttachment = { id: string; file: File; kind: "image" | "file"; url?: string };
const pendingAttachments = ref<PendingAttachment[]>([]);

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function addAttachment(file: File, kind: "image" | "file") {
  const id = makeId();
  const a: PendingAttachment = { id, file, kind };
  if (kind === "image") a.url = URL.createObjectURL(file);
  pendingAttachments.value = [...pendingAttachments.value, a];
}

function removeAttachment(id: string) {
  const list = pendingAttachments.value;
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return;
  const target = list[idx];
  if (target.url) URL.revokeObjectURL(target.url);
  const next = [...list.slice(0, idx), ...list.slice(idx + 1)];
  pendingAttachments.value = next;
}

function clearAttachments() {
  for (const a of pendingAttachments.value) {
    if (a.url) URL.revokeObjectURL(a.url);
  }
  pendingAttachments.value = [];
}

function openImagePicker() {
  closeAttachMenu();
  imageInput.value?.click();
}

function openFilePicker() {
  closeAttachMenu();
  fileInput.value?.click();
}

function onPickImages(ev: Event) {
  const el = ev.target as HTMLInputElement;
  const files = Array.from(el.files ?? []);
  for (const f of files) addAttachment(f, "image");
  el.value = "";
}

function onPickFiles(ev: Event) {
  const el = ev.target as HTMLInputElement;
  const files = Array.from(el.files ?? []);
  for (const f of files) addAttachment(f, "file");
  el.value = "";
}

// composer drag & drop
const composerDragActive = ref(false);
const composerDragDepth = ref(0);
function onComposerDragEnter() {
  composerDragDepth.value++;
  composerDragActive.value = true;
}
function onComposerDragOver() {
  composerDragActive.value = true;
}
function onComposerDragLeave() {
  composerDragDepth.value = Math.max(0, composerDragDepth.value - 1);
  if (composerDragDepth.value === 0) composerDragActive.value = false;
}
function onComposerDrop(ev: DragEvent) {
  composerDragDepth.value = 0;
  composerDragActive.value = false;
  const dt = ev.dataTransfer;
  const files = Array.from(dt?.files ?? []);
  for (const f of files) {
    const kind: "image" | "file" = String(f.type || "").startsWith("image/") ? "image" : "file";
    addAttachment(f, kind);
  }
}
const scroller = ref<HTMLDivElement | null>(null);
const scrollerLeft = ref<HTMLDivElement | null>(null);
const scrollerRight = ref<HTMLDivElement | null>(null);
const isTranslateOn = ref(false);
const translateTargetLang = ref<"ko" | "en">("ko");
const translatedByKey = ref<Record<string, string>>({});
const translatePendingById = ref<Record<string, boolean>>({});
const LS_TRANSLATIONS_BY_ROOM = "jarvis.desktop.translationsByRoom";
const LS_TRANSLATE_TARGET_LANG = "jarvis.desktop.translateTargetLang";
let translateRunId = 0;
let syncingScroll = false;

try {
  const raw = localStorage.getItem(LS_TRANSLATE_TARGET_LANG);
  if (raw === "ko" || raw === "en") translateTargetLang.value = raw;
} catch {
  // ignore
}

watch(translateTargetLang, (v) => {
  try {
    localStorage.setItem(LS_TRANSLATE_TARGET_LANG, v);
  } catch {
    // ignore
  }
});

function isLikelyKorean(text: string) {
  const s = String(text ?? "");
  if (!s.trim()) return true;
  const hangul = (s.match(/[가-힣]/g) ?? []).length;
  const latin = (s.match(/[A-Za-z]/g) ?? []).length;
  // 한글이 조금이라도 있으면 ko로 간주(번역 호출 스킵)
  if (hangul > 0 && latin === 0) return true;
  if (hangul > 3) return true;
  return false;
}

function isLikelyEnglish(text: string) {
  const s = String(text ?? "");
  if (!s.trim()) return true;
  const hangul = (s.match(/[가-힣]/g) ?? []).length;
  const latin = (s.match(/[A-Za-z]/g) ?? []).length;
  // 영문이 충분히 있고 한글이 거의 없으면 en으로 간주(번역 호출 스킵)
  if (latin > 0 && hangul === 0) return true;
  if (latin > 6 && hangul < 2) return true;
  return false;
}

function isLikelyTargetLang(text: string, target: "ko" | "en") {
  return target === "ko" ? isLikelyKorean(text) : isLikelyEnglish(text);
}

function translationKeyFor(m: any) {
  const id = String(m?.id ?? "");
  return `${translateTargetLang.value}:${id}`;
}

function translatedTextFor(m: any) {
  const id = String(m?.id ?? "");
  const content = String(m?.content ?? "");
  const key = `${translateTargetLang.value}:${id}`;
  if (isLikelyTargetLang(content, translateTargetLang.value)) return "같은 언어입니다";
  const cached = translatedByKey.value[key];
  if (cached) return cached;
  return "";
}

function shouldShowTranslatePendingHint(m: any) {
  const id = String(m?.id ?? "");
  const content = String(m?.content ?? "");
  const key = `${translateTargetLang.value}:${id}`;
  if (!content.trim()) return false;
  if (isLikelyTargetLang(content, translateTargetLang.value)) return false;
  if (translatedByKey.value[key]) return false;
  return true;
}

function loadTranslationsForRoom(roomId: string) {
  try {
    const raw = localStorage.getItem(LS_TRANSLATIONS_BY_ROOM);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, Record<string, string>>;
    const hit = parsed?.[roomId];
    if (hit && typeof hit === "object") translatedByKey.value = { ...translatedByKey.value, ...hit };
  } catch {
    // ignore
  }
}

function saveTranslationsForRoom(roomId: string) {
  try {
    const raw = localStorage.getItem(LS_TRANSLATIONS_BY_ROOM);
    const parsed = raw ? (JSON.parse(raw) as Record<string, Record<string, string>>) : {};
    parsed[roomId] = { ...(parsed[roomId] ?? {}), ...translatedByKey.value };
    // 너무 커지지 않도록 최근 400개 정도만 유지(대략)
    const keys = Object.keys(parsed[roomId] ?? {});
    if (keys.length > 400) {
      const trimmed: Record<string, string> = {};
      for (const k of keys.slice(keys.length - 400)) trimmed[k] = parsed[roomId][k];
      parsed[roomId] = trimmed;
    }
    localStorage.setItem(LS_TRANSLATIONS_BY_ROOM, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

function onScrollLeft() {
  if (!isTranslateOn.value) return;
  if (syncingScroll) return;
  const left = scrollerLeft.value;
  const right = scrollerRight.value;
  if (!left || !right) return;
  syncingScroll = true;
  right.scrollTop = left.scrollTop;
  window.setTimeout(() => (syncingScroll = false), 0);
}

function onScrollRight() {
  if (!isTranslateOn.value) return;
  if (syncingScroll) return;
  const left = scrollerLeft.value;
  const right = scrollerRight.value;
  if (!left || !right) return;
  syncingScroll = true;
  left.scrollTop = right.scrollTop;
  window.setTimeout(() => (syncingScroll = false), 0);
}

async function translateOneMessage(m: any, runId: number) {
  if (!isTranslateOn.value) return;
  if (runId !== translateRunId) return;
  const token = store.token;
  if (!token) return;

  const id = String(m?.id ?? "");
  const content = plainTextFromContent(String(m?.content ?? "")).trim();
  if (!id || !content) return;
  if (isDeleted(m)) return;
  const t = translateTargetLang.value;
  const key = `${t}:${id}`;
  if (translatedByKey.value[key]) return;

  // 비용 최소화: 이미 목표 언어로 보이면 호출 스킵
  if (isLikelyTargetLang(content, t)) return;

  translatePendingById.value = { ...translatePendingById.value, [key]: true };
  try {
    const res = await translateText(token, { text: content, targetLang: t });
    if (!isTranslateOn.value) return;
    if (runId !== translateRunId) return;
    const translatedText = String(res?.translatedText ?? "").trim();
    if (translatedText) {
      translatedByKey.value = { ...translatedByKey.value, [key]: translatedText };
      if (store.activeRoomId) saveTranslationsForRoom(store.activeRoomId);
    }
  } catch {
    // ignore: keep "(번역 대기)" 상태
  } finally {
    const next = { ...translatePendingById.value };
    delete next[key];
    translatePendingById.value = next;
  }
}

async function runTranslateBackfill() {
  if (!isTranslateOn.value) return;
  if (!store.activeRoomId) return;
  const runId = translateRunId;
  loadTranslationsForRoom(store.activeRoomId);

  // 너무 큰 비용 방지: 최근 메시지부터 최대 80개만 백필
  const msgs = store.activeMessages.slice(-80);
  for (const m of msgs) {
    if (!isTranslateOn.value) break;
    if (runId !== translateRunId) break;
    await translateOneMessage(m, runId);
  }

  await nextTick();
  // 스크롤 sync를 위해 초기 위치 맞춤
  try {
    if (scrollerLeft.value && scrollerRight.value) scrollerRight.value.scrollTop = scrollerLeft.value.scrollTop;
  } catch {
    // ignore
  }
}

function toggleTranslate() {
  // 토글 버튼을 눌렀을 때만 작동
  isTranslateOn.value = !isTranslateOn.value;
  translateRunId++;
  // 끌 때는 대기 상태 정리(호출 결과는 runId로 무시)
  if (!isTranslateOn.value) {
    translatePendingById.value = {};
    return;
  }
  // 켤 때만 백필/실시간 번역 시작
  runTranslateBackfill();
}
const remoteVideo = ref<HTMLVideoElement | null>(null);
const localVideo = ref<HTMLVideoElement | null>(null);

const DELETED_PLACEHOLDER = "(삭제된 메시지)";
const LS_CHAT_OPACITY = "jarvis.desktop.chatOpacity";

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 1;
  return Math.max(0, Math.min(1, n));
}

const chatOpacity = ref<number>(1);
try {
  const raw = localStorage.getItem(LS_CHAT_OPACITY);
  if (raw != null) chatOpacity.value = clamp01(Number(raw));
} catch {
  // ignore
}

watch(
  chatOpacity,
  (v) => {
    const next = clamp01(v);
    if (next !== v) chatOpacity.value = next;
    try {
      localStorage.setItem(LS_CHAT_OPACITY, String(next));
    } catch {
      // ignore
    }
  },
  { flush: "post" }
);

function resetOpacity() {
  chatOpacity.value = 1;
}

const jarvisOpen = ref(false);
const jarvisPrompt = ref("");
const jarvisTextarea = ref<HTMLTextAreaElement | null>(null);
const jarvisSuggestionsRow = ref<HTMLDivElement | null>(null);
const jarvisPopoverOpen = ref(false);
const jarvisPopover = ref<HTMLDivElement | null>(null);
const jarvisButton = ref<HTMLButtonElement | null>(null);
const jarvisPopoverTextarea = ref<HTMLTextAreaElement | null>(null);
/** 개인 질문 대화 이어가기: 방금 보낸 질문 텍스트 (답변 완료 시 선택 메시지에 추가용) */
const lastPersonalQuestionText = ref("");
type JarvisContextItem = {
  key: string;
  content: string;
  label: string;
  time: string;
  source: "message" | "mic" | "ai";
  messageId?: string;
  createdAt: number;
};
const LS_JARVIS_CONTEXTS_BY_ROOM = "jarvis.desktop.contextsByRoom";
const jarvisContextsByRoom = ref<Record<string, JarvisContextItem[]>>({});
const currentJarvisContexts = computed<JarvisContextItem[]>(() => {
  const rid = store.activeRoomId;
  if (!rid) return [];
  return jarvisContextsByRoom.value[rid] ?? [];
});
const pendingAiContextRoomId = ref<string>("");

function formatChatTime(v: any) {
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", { hour: "numeric", minute: "2-digit" }).format(d);
}

function loadJarvisContextsByRoom() {
  try {
    const raw = localStorage.getItem(LS_JARVIS_CONTEXTS_BY_ROOM);
    if (!raw) return;
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object") return;
    jarvisContextsByRoom.value = v;
  } catch {
    // ignore
  }
}

function saveJarvisContextsByRoom() {
  try {
    localStorage.setItem(LS_JARVIS_CONTEXTS_BY_ROOM, JSON.stringify(jarvisContextsByRoom.value));
  } catch {
    // ignore
  }
}

function addJarvisContextToRoom(roomId: string, item: Omit<JarvisContextItem, "key">) {
  const key = makeId();
  const next: JarvisContextItem = { key, ...item };
  const list = jarvisContextsByRoom.value[roomId] ?? [];

  // 간단한 중복 방지: messageId가 같으면 스킵, content가 완전히 같아도 스킵
  if (next.messageId && list.some((x) => x.messageId === next.messageId)) return;
  if (list.some((x) => x.content === next.content)) return;

  const capped = [...list, next].slice(-8); // 방별 최대 8개만 유지
  jarvisContextsByRoom.value = { ...jarvisContextsByRoom.value, [roomId]: capped };
  saveJarvisContextsByRoom();
}

function clearCurrentRoomJarvisContexts() {
  const rid = store.activeRoomId;
  if (!rid) return;
  const next = { ...jarvisContextsByRoom.value };
  delete next[rid];
  jarvisContextsByRoom.value = next;
  saveJarvisContextsByRoom();
}

function removeCurrentRoomJarvisContext(key: string) {
  const rid = store.activeRoomId;
  if (!rid) return;
  const list = jarvisContextsByRoom.value[rid] ?? [];
  const nextList = list.filter((x) => x.key !== key);
  jarvisContextsByRoom.value = { ...jarvisContextsByRoom.value, [rid]: nextList };
  saveJarvisContextsByRoom();
}

function focusJarvisPrompt() {
  // popover 우선, 없으면 modal
  jarvisPopoverTextarea.value?.focus();
  jarvisTextarea.value?.focus();
}

let jarvisSuggestionsPointerId: number | null = null;
let jarvisSuggestionsDragStartX = 0;
let jarvisSuggestionsDragStartScrollLeft = 0;
let jarvisSuggestionsDidDrag = false;
let jarvisSuggestionsResetTimer: number | null = null;
const JARVIS_SUGGESTIONS_DRAG_THRESHOLD_PX = 8;

const jarvisSuggestions = [
  { key: "brief_summary", label: "전체 요약", prompt: "전체 내용을 간단하게 요약해줘" },
  { key: "recent_summary", label: "최근 대화 요약", prompt: "최근 대화 내용을 요약해줘" },
  { key: "rm_links", label: "RM 링크", prompt: "관련 RM 링크 찾아줘" },
  { key: "best_internal_reco", label: "사내 인력 추천", prompt: "대화 맥락으로 봤을때 가장 최적의 사내 인력 추천좀 해줄래?" },
  { key: "latest_news", label: "최신 뉴스", prompt: "관련 최신 내용 뉴스를 찾아줘" },
  { key: "send_minutes_email", label: "회의록 메일", prompt: "회의록처럼 정리해서 참가자들 메일로 보내줘" },
  { key: "teams_alarm_10m", label: "10분 뒤 알람", prompt: "10분 뒤에 팀즈로 알람 줘" },
  { key: "write_notion", label: "노션 작성", prompt: "노션에 작성해줘" }
] as const;

function onJarvisSuggestionsPointerDown(e: PointerEvent) {
  const el = jarvisSuggestionsRow.value;
  if (!el) return;

  // 마우스는 좌클릭만, 터치는 그대로 허용
  if (e.pointerType === "mouse" && e.button !== 0) return;

  jarvisSuggestionsPointerId = e.pointerId;
  jarvisSuggestionsDragStartX = e.clientX;
  jarvisSuggestionsDragStartScrollLeft = el.scrollLeft;
  jarvisSuggestionsDidDrag = false;

  // 클릭 사용성을 위해: 실제 드래그가 시작될 때만 pointer capture 적용
}

function onJarvisSuggestionsPointerMove(e: PointerEvent) {
  const el = jarvisSuggestionsRow.value;
  if (!el) return;
  if (jarvisSuggestionsPointerId !== e.pointerId) return;

  const dx = e.clientX - jarvisSuggestionsDragStartX;
  if (!jarvisSuggestionsDidDrag) {
    if (Math.abs(dx) < JARVIS_SUGGESTIONS_DRAG_THRESHOLD_PX) return;
    jarvisSuggestionsDidDrag = true;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }
  el.scrollLeft = jarvisSuggestionsDragStartScrollLeft - dx;
}

function onJarvisSuggestionsPointerUp(e: PointerEvent) {
  const el = jarvisSuggestionsRow.value;
  if (!el) return;
  if (jarvisSuggestionsPointerId !== e.pointerId) return;

  jarvisSuggestionsPointerId = null;

  if (jarvisSuggestionsDidDrag) {
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    // 드래그 직후 발생하는 클릭 이벤트만 차단하고 즉시 복구
    if (jarvisSuggestionsResetTimer != null) window.clearTimeout(jarvisSuggestionsResetTimer);
    jarvisSuggestionsResetTimer = window.setTimeout(() => {
      jarvisSuggestionsDidDrag = false;
      jarvisSuggestionsResetTimer = null;
    }, 0);
  }
}

async function onJarvisSuggestionClick(prompt: string, ev: MouseEvent) {
  if (jarvisSuggestionsDidDrag) {
    ev.preventDefault();
    ev.stopPropagation();
    jarvisSuggestionsDidDrag = false;
    return;
  }
  await applyJarvisSuggestion(prompt);
}

async function onJarvisContextClick(content: string) {
  await applyJarvisSuggestion(content);
}

async function applyJarvisSuggestion(prompt: string) {
  jarvisPrompt.value = prompt;
  await nextTick();
  focusJarvisPrompt();
}

function openJarvisWithPrompt(prompt: string) {
  if (!store.activeRoomId) return;
  jarvisPrompt.value = prompt;
  jarvisOpen.value = true;
}

// ---- Listening (Mic + Speech-to-text) ----
const isListening = ref(false);
const micLevel = ref(0); // 0..1
const micPhase = ref(0);

let micStream: MediaStream | null = null;
let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let rafId: number | null = null;

let recognition: any | null = null;
const listeningTextFinal = ref("");
const listeningTextInterim = ref("");

function micBarHeight(i: number) {
  const v = Math.max(0, Math.min(1, micLevel.value));
  const wave = Math.sin(micPhase.value + i * 1.15) * 0.5 + 0.5; // 0..1
  const px = 4 + v * (10 + 6 * wave);
  return `${Math.round(px)}px`;
}

function stopMicMeter() {
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  micLevel.value = 0;
}

async function startMicMeter(stream: MediaStream) {
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 1024;

  const src = audioCtx.createMediaStreamSource(stream);
  src.connect(analyser);

  const data = new Uint8Array(analyser.fftSize);
  const tick = () => {
    if (!analyser) return;
    analyser.getByteTimeDomainData(data);

    // RMS 계산으로 "주파수처럼" 움직이는 레벨
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const x = (data[i] - 128) / 128;
      sum += x * x;
    }
    const rms = Math.sqrt(sum / data.length);
    micLevel.value = Math.max(0, Math.min(1, rms * 3.5));
    micPhase.value += 0.22;
    rafId = requestAnimationFrame(tick);
  };
  tick();
}

function startSpeechRecognition() {
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Ctor) return;

  recognition = new Ctor();
  recognition.lang = "ko-KR";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (e: any) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      const t = (r?.[0]?.transcript ?? "").trim();
      if (!t) continue;
      if (r.isFinal) listeningTextFinal.value += (listeningTextFinal.value ? " " : "") + t;
      else interim += (interim ? " " : "") + t;
    }
    listeningTextInterim.value = interim.trim();
  };

  recognition.onerror = () => {
    // 권한/환경에 따라 실패할 수 있음. 마이크 레벨 표시는 계속 유지.
  };

  try {
    recognition.start();
  } catch {
    // start()가 중복 호출되면 예외가 날 수 있음
  }
}

function stopSpeechRecognition() {
  if (!recognition) return;
  try {
    recognition.stop();
  } catch {
    // ignore
  }
  recognition = null;
}

function getListeningText() {
  const v = [listeningTextFinal.value.trim(), listeningTextInterim.value.trim()].filter(Boolean).join(" ").trim();
  return v;
}

async function startListening() {
  if (isListening.value) return;
  listeningTextFinal.value = "";
  listeningTextInterim.value = "";

  micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  await startMicMeter(micStream);
  startSpeechRecognition();
  isListening.value = true;
}

async function stopListeningAndOpenJarvis() {
  if (!isListening.value) return;
  isListening.value = false;

  stopSpeechRecognition();
  stopMicMeter();

  try {
    micStream?.getTracks().forEach((t) => t.stop());
  } catch {
    // ignore
  }
  micStream = null;

  try {
    await audioCtx?.close();
  } catch {
    // ignore
  }
  audioCtx = null;
  analyser = null;

  const rid = store.activeRoomId;
  const transcript = getListeningText().trim();
  listeningTextFinal.value = "";
  listeningTextInterim.value = "";
  if (rid && transcript) {
    addJarvisContextToRoom(rid, {
      content: transcript,
      label: "voice",
      time: formatChatTime(Date.now()),
      source: "mic",
      createdAt: Date.now()
    });
  }

  // 선택 메시지 반영이 돔에 적용된 뒤 AI 질문 팝업 열기, 질문 textarea에는 전사 내용 자동 반영
  await nextTick();
  await openJarvisPopoverWithPrompt(transcript ?? "");
}

async function toggleListening() {
  try {
    if (isListening.value) await stopListeningAndOpenJarvis();
    else await startListening();
  } catch (e: any) {
    // 권한 거부 등
    isListening.value = false;
    stopSpeechRecognition();
    stopMicMeter();
    try {
      micStream?.getTracks().forEach((t) => t.stop());
    } catch {
      // ignore
    }
    micStream = null;
    alert(e?.message ?? "마이크를 사용할 수 없습니다.");
  }
}

onBeforeUnmount(() => {
  // 뷰 전환 시 마이크가 남지 않도록 정리
  if (isListening.value) {
    // fire and forget
    stopListeningAndOpenJarvis();
  } else {
    stopSpeechRecognition();
    stopMicMeter();
    try {
      micStream?.getTracks().forEach((t) => t.stop());
    } catch {
      // ignore
    }
    micStream = null;
    audioCtx?.close().catch(() => undefined);
    audioCtx = null;
    analyser = null;
  }
});

function onDocPointerDown(ev: PointerEvent) {
  const t = ev.target as Node | null;
  if (!t) return;

  if (emojiOpen.value) {
    if (!emojiPopover.value?.contains(t) && !emojiButton.value?.contains(t)) closeEmojiPicker();
  }
  if (attachOpen.value) {
    if (!attachPopover.value?.contains(t) && !attachButton.value?.contains(t)) closeAttachMenu();
  }
  if (jarvisPopoverOpen.value) {
    if (!jarvisPopover.value?.contains(t) && !jarvisButton.value?.contains(t)) closeJarvisPopover();
  }
  if (messageMenuOpenId.value) {
    // 메뉴 내부 클릭은 @pointerdown.stop으로 막음. 여기까지 왔으면 바깥 클릭.
    closeMessageMenu();
  }
  if (contextMenuMessage.value && !contextMenuRef.value?.contains(t as Node)) {
    closeMessageContextMenu();
  }
}

function onDocKeyDown(ev: KeyboardEvent) {
  if (ev.key === "Escape") closeAllComposerPopovers();
}

onMounted(() => {
  loadRecentEmojis();
  loadJarvisContextsByRoom();
  document.addEventListener("pointerdown", onDocPointerDown);
  document.addEventListener("keydown", onDocKeyDown);
  theme.value = getActiveTheme();
  themeObserver = new MutationObserver(() => {
    theme.value = getActiveTheme();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onDocPointerDown);
  document.removeEventListener("keydown", onDocKeyDown);
  clearAttachments();
  themeObserver?.disconnect();
  themeObserver = null;
});

type Colleague = {
  id: string;
  email: string;
  name: string;
  isOnline: boolean;
  lastSeenAt?: string | null;
  team?: string;
  role?: string;
  tags: string[];
};
const inviteOpen = ref(false);
const inviteQuery = ref("");
const selectedColleagueIds = ref<string[]>([]);
const colleagues = ref<Colleague[]>([]);
const inviteLoading = ref(false);
const inviteErrorText = ref("");

let invitePollTimer: any = null;

const pastMeetingImportOpen = ref(false);
const selectedSourceRoomId = ref<string>("");
const pastMeetingLoading = ref(false);
const pastMeetingError = ref("");

const newsPopupOpen = ref(false);
const roomNewsItems = ref<RoomNewsItemDto[]>([]);
const roomNewsLoading = ref(false);
const roomNewsError = ref("");
const roomNewsCache = ref<Record<string, { items: RoomNewsItemDto[]; date: string }>>({});

function getTodayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

function openNewsPopup() {
  newsPopupOpen.value = true;
  roomNewsError.value = "";
  const roomId = store.activeRoomId;
  if (!roomId) {
    roomNewsItems.value = [];
    return;
  }
  const today = getTodayDateStr();
  const cached = roomNewsCache.value[roomId];
  if (cached && cached.date === today) {
    roomNewsItems.value = cached.items;
    return;
  }
  loadRoomNews(roomId);
}

async function loadRoomNews(roomId: string) {
  if (!store.token) return;
  roomNewsLoading.value = true;
  roomNewsError.value = "";
  roomNewsItems.value = [];
  try {
    const { items } = await fetchRoomNews(store.token, roomId);
    roomNewsItems.value = items ?? [];
    roomNewsCache.value[roomId] = { items: items ?? [], date: getTodayDateStr() };
  } catch (e: any) {
    roomNewsError.value = e?.message ?? "뉴스를 불러오지 못했습니다.";
    roomNewsItems.value = [];
  } finally {
    roomNewsLoading.value = false;
  }
}

function closeNewsPopup() {
  newsPopupOpen.value = false;
}

function formatNewsDate(pubDate: string) {
  if (!pubDate) return "";
  const d = new Date(pubDate);
  if (!Number.isFinite(d.getTime())) return pubDate;
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

const pastMeetingRooms = computed(() => {
  const active = store.activeRoomId;
  if (!active) return [];
  return store.rooms.filter((r) => r.id !== active);
});

const forwardMessageOpen = ref(false);
const forwardMessageTarget = ref<any | null>(null);
const selectedForwardRoomId = ref<string>("");
const forwardRooms = computed(() => {
  const active = store.activeRoomId;
  if (!active) return [];
  return store.rooms.filter((r) => r.id !== active);
});

function formatPastMeetingTime(v: any) {
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return "";
  const now = Date.now();
  const diff = now - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return "오늘";
  if (diff < 2 * day) return "어제";
  if (diff < 7 * day) return `${Math.floor(diff / day)}일 전`;
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))}주 전`;
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
}

function openPastMeetingImport() {
  selectedSourceRoomId.value = "";
  pastMeetingError.value = "";
  pastMeetingImportOpen.value = true;
}

function closePastMeetingImport() {
  pastMeetingImportOpen.value = false;
  pastMeetingError.value = "";
}

async function submitPastMeetingImport() {
  const target = store.activeRoomId;
  const source = selectedSourceRoomId.value;
  if (!store.token || !target || !source) return;
  pastMeetingLoading.value = true;
  pastMeetingError.value = "";
  try {
    await importMeetingSummary(store.token, target, source);
    closePastMeetingImport();
  } catch (e: any) {
    pastMeetingError.value = e?.message ?? "요약 가져오기에 실패했습니다.";
  } finally {
    pastMeetingLoading.value = false;
  }
}

async function loadColleagues() {
  if (!store.token) return;
  inviteLoading.value = true;
  inviteErrorText.value = "";
  try {
    const users = await fetchUsers(store.token, undefined, { includeMe: true });
    colleagues.value = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      isOnline: !!u.isOnline,
      lastSeenAt: u.lastSeenAt,
      // optional fields (kept for UI compatibility)
      team: "",
      role: "",
      tags: []
    }));
  } catch {
    inviteErrorText.value = "동료 목록을 불러오지 못했습니다. (서버 연결/로그인 상태를 확인해주세요)";
  } finally {
    inviteLoading.value = false;
  }
}

const filteredColleagues = computed(() => {
  const q = inviteQuery.value.trim().toLowerCase();
  if (!q) return colleagues.value;
  return colleagues.value.filter((c) => {
    const hay = [c.team ?? "", c.email ?? "", c.name ?? "", c.role ?? "", ...(c.tags ?? [])].join(" ").toLowerCase();
    return hay.includes(q);
  });
});

const editingId = ref<string>("");
const editingText = ref<string>("");
const editingAttachmentBlock = ref<string>("");
const editingHasAttachments = computed(() => !!String(editingAttachmentBlock.value ?? "").trim());
const messageMenuOpenId = ref<string>("");
const contextMenuMessage = ref<any | null>(null);
const contextMenuPos = ref({ x: 0, y: 0 });
const contextMenuRef = ref<HTMLDivElement | null>(null);
const confirmedMessageIds = ref<Set<string>>(new Set());
const deleteConfirmOpen = ref(false);
const deleteTarget = ref<any | null>(null);

const renameRoomOpen = ref(false);
const renameRoomTitle = ref("");
const deleteRoomOpen = ref(false);

function isMine(m: any) {
  return m?.senderType === "user" && m?.senderUserId && store.user?.id && m.senderUserId === store.user.id;
}
function isOtherUser(m: any) {
  return m?.senderType === "user" && !isMine(m);
}
function isBot(m: any) {
  return m?.senderType === "bot";
}
function isDeleted(m: any) {
  return String(m?.content ?? "") === DELETED_PLACEHOLDER;
}

function labelFor(m: any) {
  if (isBot(m)) return "ai";
  if (isMine(m)) return "me";
  if (isOtherUser(m)) return "other";
  return m?.senderType ?? "system";
}

function bubbleWrapClass(m: any) {
  if (isMine(m)) return "justify-end";
  if (isBot(m)) return "justify-start";
  if (isOtherUser(m)) return "justify-start";
  return "justify-center";
}
function bubbleColumnClass(m: any) {
  if (isMine(m)) return "items-end";
  if (isBot(m) || isOtherUser(m)) return "items-start";
  return "items-center";
}
function metaClass(m: any) {
  if (isMine(m)) return "justify-end";
  if (isBot(m) || isOtherUser(m)) return "justify-start";
  return "justify-center";
}
function bubbleClass(m: any) {
  if (isMine(m)) return "t-bubble-me";
  if (isBot(m)) return "t-bubble-bot";
  if (isOtherUser(m)) return "t-bubble-other";
  return "t-bubble-system";
}

function canEditOrDelete(m: any) {
  if (!store.activeRoomId) return false;
  if (!isMine(m)) return false;
  if (isDeleted(m)) return false;
  // local optimistic message는 서버 id가 아니라서 제외
  if (typeof m?.id === "string" && m.id.startsWith("local:")) return false;
  return true;
}

function startEdit(m: any) {
  if (!canEditOrDelete(m)) return;
  editingId.value = m.id;
  const parsed = splitContent(String(m?.content ?? ""));
  editingText.value = parsed.text ?? "";
  editingAttachmentBlock.value = parsed.block ?? "";
}
function cancelEdit() {
  editingId.value = "";
  editingText.value = "";
  editingAttachmentBlock.value = "";
}
function submitEdit(m: any) {
  if (!store.activeRoomId) return;
  const v = String(editingText.value ?? "").trim();
  const block = String(editingAttachmentBlock.value ?? "").trim();
  if (!v && !block) return;
  const next = block ? (v ? `${v}\n\n${block}` : block) : v;
  store.editMessage(store.activeRoomId, m.id, next);
  cancelEdit();
}

function toggleMessageMenu(m: any) {
  if (!canEditOrDelete(m)) return;
  messageMenuOpenId.value = messageMenuOpenId.value === m.id ? "" : m.id;
}
function closeMessageMenu() {
  messageMenuOpenId.value = "";
}

function onMessageContextMenu(ev: MouseEvent, m: any) {
  ev.preventDefault();
  contextMenuMessage.value = m;
  contextMenuPos.value = { x: ev.clientX, y: ev.clientY };
}
function closeMessageContextMenu() {
  contextMenuMessage.value = null;
}
function isMessageConfirmed(m: any) {
  return m?.id != null && confirmedMessageIds.value.has(String(m.id));
}
function markMessageConfirmed(m: any) {
  if (m?.id == null) return;
  const id = String(m.id);
  const next = new Set(confirmedMessageIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  confirmedMessageIds.value = next;
  closeMessageContextMenu();
}
function openForwardMessageModal(m: any) {
  forwardMessageTarget.value = m;
  selectedForwardRoomId.value = "";
  closeMessageContextMenu();
  forwardMessageOpen.value = true;
}
function closeForwardMessage() {
  forwardMessageOpen.value = false;
  forwardMessageTarget.value = null;
  selectedForwardRoomId.value = "";
}
function submitForwardMessage() {
  const targetRoomId = selectedForwardRoomId.value;
  const msg = forwardMessageTarget.value;
  if (!targetRoomId || !msg) return;
  const content = parsedFor(msg).text ? String(parsedFor(msg).text).trim() : "";
  if (!content) return;
  store.sendMessage(targetRoomId, content);
  closeForwardMessage();
}

function confirmDelete(m: any) {
  if (!canEditOrDelete(m)) return;
  deleteTarget.value = m;
  deleteConfirmOpen.value = true;
}
function closeDeleteConfirm() {
  deleteConfirmOpen.value = false;
  deleteTarget.value = null;
}
function submitDeleteConfirm() {
  if (!store.activeRoomId || !deleteTarget.value) return;
  store.deleteMessage(store.activeRoomId, deleteTarget.value.id);
  closeDeleteConfirm();
}

function openRenameRoom() {
  if (!store.activeRoomId) return;
  renameRoomTitle.value = store.activeRoom?.title ?? "";
  renameRoomOpen.value = true;
}
function closeRenameRoom() {
  renameRoomOpen.value = false;
}
function submitRenameRoom() {
  if (!store.activeRoomId) return;
  const t = renameRoomTitle.value.trim();
  if (!t) return;
  store.renameRoom(store.activeRoomId, t);
  renameRoomOpen.value = false;
}

function openDeleteRoom() {
  if (!store.activeRoomId) return;
  deleteRoomOpen.value = true;
}
function closeDeleteRoom() {
  deleteRoomOpen.value = false;
}
function submitDeleteRoom() {
  if (!store.activeRoomId) return;
  const rid = store.activeRoomId;
  store.deleteRoom(rid);
  deleteRoomOpen.value = false;
}

function scrollToBottom() {
  if (!scroller.value) return;
  scroller.value.scrollTop = scroller.value.scrollHeight;
}

async function send() {
  if (!store.activeRoomId) return;
  if (isSending.value) return;
  const base = text.value.trim();
  if (!base && pendingAttachments.value.length === 0) return;

  isSending.value = true;
  try {
    const MAX_EMBED_BYTES_PER_FILE = 5 * 1024 * 1024;
    const MAX_EMBED_BYTES_TOTAL = 12 * 1024 * 1024;
    let total = 0;

    const attachments: ChatAttachmentPayload[] = [];
    for (const a of pendingAttachments.value) {
      const f = a.file;
      const mime = String(f.type || "application/octet-stream");
      const payload: ChatAttachmentPayload = {
        kind: a.kind,
        name: f.name,
        mime,
        size: f.size
      };

      // prototype: embed as dataURL so all clients can preview/download
      if (f.size <= MAX_EMBED_BYTES_PER_FILE && total + f.size <= MAX_EMBED_BYTES_TOTAL) {
        try {
          payload.dataUrl = await readAsDataUrl(f);
          total += f.size;
        } catch {
          // keep metadata only
        }
      }
      attachments.push(payload);
    }

    const content = composeContent(base, attachments);
    store.sendMessage(store.activeRoomId, content);

    // jarvis trigger: only by plain text (attachments are ignored)
    const triggerText = base || plainTextFromContent(content);
    if (isJarvisTrigger(triggerText)) {
      store.askJarvis(store.activeRoomId, JARVIS_NO_GREETING + stripJarvisPrefix(triggerText));
    }

    text.value = "";
    clearAttachments();
    await nextTick();
    scrollToBottom();
  } finally {
    isSending.value = false;
  }
}

function askJarvisQuick() {
  if (!store.activeRoomId) return;
  openJarvisPopoverWithPrompt("");
}

function closeJarvis() {
  jarvisOpen.value = false;
}

/** AI에게 전달하는 공통 지시: 인사 생략 */
const JARVIS_NO_GREETING = "인사(안녕하세요 등)는 생략하고 바로 답변해줘.\n\n";

function buildJarvisPromptBlock(): string {
  const p = jarvisPrompt.value.trim();
  if (!p) return "";
  const contexts = currentJarvisContexts.value;
  return contexts.length
    ? [
        "아래 메시지들을 참고해서 답해줘.",
        "",
        ...contexts.flatMap((c, idx) => [
          `[메시지 ${idx + 1}] (${c.label} · ${c.time})`,
          c.content,
          ""
        ]),
        "[질문/요청]",
        p
      ].join("\n")
    : p;
}

/** 공유 질문: 채팅창에 답변 표시, 팝업 자동 닫힘 */
function submitJarvisShared() {
  if (!store.activeRoomId) return;
  const ctxBlock = buildJarvisPromptBlock();
  if (!ctxBlock) return;
  jarvisOpen.value = false;
  jarvisPopoverOpen.value = false;
  pendingAiContextRoomId.value = store.activeRoomId;
  store.askJarvis(store.activeRoomId, JARVIS_NO_GREETING + ctxBlock, false);
}

/** 개인 질문: 팝업 내 답변 영역에만 표시, 팝업 유지. 전송 후 textarea 비우고, 답변 완료 시 다음 질문에서 맥락 유지되도록 선택 메시지에 추가 */
function submitJarvisPersonal() {
  if (!store.activeRoomId) return;
  const ctxBlock = buildJarvisPromptBlock();
  if (!ctxBlock) return;
  const userQuestion = jarvisPrompt.value.trim();
  lastPersonalQuestionText.value = userQuestion;
  store.askJarvis(store.activeRoomId, JARVIS_NO_GREETING + ctxBlock, true);
  jarvisPrompt.value = "";
}

async function openJarvisPopoverWithPrompt(prompt: string) {
  if (!store.activeRoomId) return;
  closeEmojiPicker();
  closeAttachMenu();
  jarvisPopoverOpen.value = true;
  jarvisPrompt.value = prompt;
  await nextTick();
  focusJarvisPrompt();
}

async function openJarvisPopoverFromMessage(m: any) {
  if (!store.activeRoomId) return;
  closeEmojiPicker();
  closeAttachMenu();
  jarvisPopoverOpen.value = true;

  const content = plainTextFromContent(String(m?.content ?? "")).trim();
  const rid = store.activeRoomId;
  const ctx = content && content !== DELETED_PLACEHOLDER ? content : "";
  if (rid && ctx) {
    addJarvisContextToRoom(rid, {
      content: ctx,
      label: labelFor(m),
      time: formatChatTime(m?.createdAt),
      source: "message",
      messageId: String(m?.id ?? ""),
      createdAt: Date.now()
    });
  }

  // 사용자가 "질문/요청"을 바로 입력하도록 prompt는 비워둠
  jarvisPrompt.value = "";
  await nextTick();
  focusJarvisPrompt();
}

function closeJarvisPopover() {
  jarvisPopoverOpen.value = false;
  store.clearPersonalJarvisResponse();
  lastPersonalQuestionText.value = "";
}

/** 개인 질문 답변 완료 시: 방금 질문+답변을 선택 메시지에 넣어 다음 개인/공유 질문에서 대화가 이어지도록 */
watch(
  () => store.personalJarvisDone,
  (done) => {
    if (!done || !lastPersonalQuestionText.value || !store.activeRoomId) return;
    const rid = store.activeRoomId;
    const answer = store.personalJarvisContent || "";
    addJarvisContextToRoom(rid, {
      content: lastPersonalQuestionText.value,
      label: "질문",
      time: formatChatTime(Date.now()),
      source: "message",
      createdAt: Date.now()
    });
    if (answer) {
      addJarvisContextToRoom(rid, {
        content: answer,
        label: "ai",
        time: formatChatTime(Date.now()),
        source: "ai",
        createdAt: Date.now()
      });
    }
    lastPersonalQuestionText.value = "";
  }
);

watch(
  () => store.activeMessages.length,
  (len, prev) => {
    if (!store.activeRoomId) return;
    if (!prev || len <= prev) return;
    if (!pendingAiContextRoomId.value) return;
    if (pendingAiContextRoomId.value !== store.activeRoomId) return;

    const last = store.activeMessages[len - 1];
    if (!last) return;
    if (!isBot(last)) return;
    const content = String(last?.content ?? "").trim();
    if (!content || content === DELETED_PLACEHOLDER) return;

    addJarvisContextToRoom(store.activeRoomId, {
      content,
      label: "ai",
      time: formatChatTime(last?.createdAt ?? Date.now()),
      source: "ai",
      messageId: String(last?.id ?? ""),
      createdAt: Date.now()
    });
    pendingAiContextRoomId.value = "";
  }
);

function openInvite() {
  inviteQuery.value = "";
  selectedColleagueIds.value = [];
  loadColleagues();
  inviteOpen.value = true;
}

function closeInvite() {
  inviteOpen.value = false;
}

watch(
  inviteOpen,
  (v) => {
    if (invitePollTimer) {
      clearInterval(invitePollTimer);
      invitePollTimer = null;
    }
    if (v) {
      // refresh presence while the modal is open
      invitePollTimer = setInterval(loadColleagues, 5000);
    }
  },
  { immediate: true }
);

function submitInvite() {
  // 아직 시스템에 동료/초대 데이터가 없으니 UI만 우선.
  // 추후: store.inviteToRoom(store.activeRoomId, selectedColleagueIds.value)
  inviteOpen.value = false;
}

async function startShare() {
  if (!store.activeRoomId) return;
  try {
    await store.startScreenShare(store.activeRoomId);
  } catch (e: any) {
    alert(e?.message ?? "화면 공유를 시작할 수 없습니다.");
  }
}

function stopShare() {
  store.stopScreenShare(store.activeRoomId);
}

watch(
  () => store.activeMessages.length,
  async () => {
    await nextTick();
    scrollToBottom();
  }
);

watch(
  () => store.activeMessages.length,
  async (len, prev) => {
    if (!isTranslateOn.value) return;
    if (!store.activeRoomId) return;
    if (!prev || len <= prev) return;
    const last = store.activeMessages[len - 1];
    if (!last) return;
    const runId = translateRunId;
    await translateOneMessage(last, runId);
  }
);

watch(
  () => store.activeRoomId,
  async (rid) => {
    if (!rid) return;
    if (!isTranslateOn.value) return;
    translateRunId++;
    await nextTick();
    runTranslateBackfill();
  }
);

watch(
  () => translateTargetLang.value,
  async () => {
    if (!isTranslateOn.value) return;
    if (!store.activeRoomId) return;
    translateRunId++;
    translatePendingById.value = {};
    await nextTick();
    runTranslateBackfill();
  }
);

watch(
  () => store.screenShareRemote,
  async (s) => {
    await nextTick();
    const show = store.screenShareRoomId === store.activeRoomId ? s : null;
    if (remoteVideo.value) (remoteVideo.value as any).srcObject = show ?? null;
  },
  { immediate: true }
);

watch(
  () => store.screenShareLocal,
  async (s) => {
    await nextTick();
    const show = store.screenShareRoomId === store.activeRoomId ? s : null;
    if (localVideo.value) (localVideo.value as any).srcObject = show ?? null;
  },
  { immediate: true }
);

watch(
  () => store.activeRoomId,
  async () => {
    await nextTick();
    const remote = store.screenShareRoomId === store.activeRoomId ? store.screenShareRemote : null;
    const local = store.screenShareRoomId === store.activeRoomId ? store.screenShareLocal : null;
    if (remoteVideo.value) (remoteVideo.value as any).srcObject = remote ?? null;
    if (localVideo.value) (localVideo.value as any).srcObject = local ?? null;
  }
);
</script>

<style scoped>
.chat-opacity-range {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 9999px;
  background: var(--range-track);
  outline: none;
  cursor: pointer;
}

.emoji-popover {
  user-select: none;
}
.attach-popover {
  user-select: none;
}
.attach-action {
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  cursor: pointer;
  font-size: 12px;
  color: var(--text-muted);
}
.attach-action:hover {
  background: var(--row-hover);
}
.attach-chip {
  background: var(--surface-2);
}
.attach-remove {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: transparent;
  cursor: pointer;
  line-height: 1;
  color: var(--text-muted);
}
.attach-remove:hover {
  background: var(--row-hover);
}

.composer-drop-active {
  outline: 2px dashed rgba(0, 105, 77, 0.45);
  outline-offset: 4px;
  border-radius: 12px;
}
.composer-drop-overlay {
  position: absolute;
  inset: -6px;
  border-radius: 12px;
  background: rgba(0, 173, 80, 0.08);
  border: 2px dashed rgba(0, 105, 77, 0.45);
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
}
.composer-drop-overlay-inner {
  font-size: 12px;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.9);
  padding: 6px 10px;
  border-radius: 9999px;
  border: 1px solid var(--border);
}

.msg-attach-image {
  width: 100%;
  max-height: 220px;
  object-fit: cover;
  display: block;
}
.emoji-grid {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 4px;
  max-height: 240px;
  overflow: auto;
  padding-right: 2px;
}
.emoji-chip {
  height: 28px;
  width: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}
.emoji-chip:hover {
  background: var(--row-hover);
}

.chat-opacity-range::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 9999px;
  background: var(--range-track);
}

.chat-opacity-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  margin-top: -4px; /* center thumb on 4px track */
  border-radius: 9999px;
  background: var(--range-thumb);
  border: 2px solid var(--range-thumb-border);
}

.chat-opacity-range::-moz-range-track {
  height: 4px;
  border-radius: 9999px;
  background: var(--range-track);
}

.chat-opacity-range::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  background: var(--range-thumb);
  border: 2px solid var(--range-thumb-border);
}

.t-dragscroll-x {
  user-select: none;
  touch-action: pan-y;
}

.jarvis-context-preview {
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.jarvis-context-list {
  /* 선택 메시지: 최대 2개 높이만 노출 + 스크롤 */
  max-height: 168px;
  overflow-y: auto;
  padding: 8px;
  border-radius: 10px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  scrollbar-gutter: stable;
}

.jarvis-context-item + .jarvis-context-item {
  margin-top: 8px;
}
</style>
