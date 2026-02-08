<template>
  <div class="h-full flex flex-col min-h-0">
    <div class="border-b t-border" :class="isMiniMode ? 'p-2' : 'p-3'">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <div class="text-sm font-semibold truncate">{{ store.activeRoom?.title ?? "No room" }}</div>
          <div v-if="!isMiniMode" class="text-xs t-text-subtle font-mono truncate">{{ store.activeRoomId }}</div>
        </div>
        <div v-if="store.activeRoomId && !isMiniMode" class="flex items-center gap-2 shrink-0">
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
          <button class="px-2 py-1 text-xs rounded t-btn-secondary" @click="openInvite">
            + 동료추가
          </button>
          <button
            class="px-2 py-1 text-xs rounded t-btn-secondary"
            :disabled="store.screenShareMode === 'sharing' && store.screenShareRoomId === store.activeRoomId"
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

    <div class="flex-1 min-h-0" :class="isTranslateOn ? 'overflow-hidden' : ''">
      <div
        v-if="!isTranslateOn"
        ref="scroller"
        class="h-full overflow-auto space-y-2 t-surface t-scrollbar"
        :class="isMiniMode ? 'p-2' : 'p-3'"
        :style="{ opacity: String(chatOpacity) }"
      >
        <div v-for="m in store.activeMessages" :key="m.id" class="w-full">
          <div class="flex" :class="bubbleWrapClass(m)">
            <div class="max-w-[72%] min-w-0">
              <div class="text-[11px] t-text-subtle flex items-center gap-2 w-full" :class="metaClass(m)">
                <span class="font-mono">{{ labelFor(m) }}</span>
                <span class="tabular-nums">{{ formatChatTime(m.createdAt) }}</span>
                <span v-if="isDeleted(m)" class="t-text-faint">삭제됨</span>
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
                      class="w-full text-left px-2 py-1.5 text-xs rounded t-btn-danger bg-transparent border-0 hover:t-row"
                      @click="confirmDelete(m); closeMessageMenu()"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>

              <div
                class="group mt-1 rounded-2xl border px-3 py-2 text-sm whitespace-pre-wrap break-words"
                :class="bubbleClass(m)"
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
                      :disabled="!editingText.trim().length"
                      @click="submitEdit(m)"
                    >
                      저장
                    </button>
                  </div>
                </template>
                <template v-else>
                  <div :class="isDeleted(m) ? 'italic t-text-muted' : ''">
                    {{ isDeleted(m) ? "(삭제된 메시지)" : m.content }}
                  </div>

                  <div v-if="canEditOrDelete(m)" class="mt-2 hidden group-hover:flex items-center justify-end gap-2">
                    <button class="px-2 py-1 text-xs rounded t-btn-secondary" @click="startEdit(m)">수정</button>
                    <button class="px-2 py-1 text-xs rounded t-btn-danger" @click="confirmDelete(m)">삭제</button>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="h-full grid grid-cols-2 gap-2" :class="isMiniMode ? 'p-2' : 'p-3'">
        <div class="min-h-0 rounded border t-border overflow-hidden">
          <div
            ref="scrollerLeft"
            class="h-full overflow-auto space-y-2 t-surface t-scrollbar p-3"
            :style="{ opacity: String(chatOpacity) }"
            @scroll="onScrollLeft"
          >
            <div v-for="m in store.activeMessages" :key="m.id" class="w-full">
              <div class="flex" :class="bubbleWrapClass(m)">
                <div class="max-w-[72%] min-w-0">
                  <div class="text-[11px] t-text-subtle flex items-center gap-2 w-full" :class="metaClass(m)">
                    <span class="font-mono">{{ labelFor(m) }}</span>
                    <span class="tabular-nums">{{ formatChatTime(m.createdAt) }}</span>
                    <span v-if="isDeleted(m)" class="t-text-faint">삭제됨</span>
                    <div v-if="canEditOrDelete(m)" class="ml-auto relative">
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
                    class="mt-1 rounded-2xl border px-3 py-2 text-sm whitespace-pre-wrap break-words"
                    :class="bubbleClass(m)"
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
                          :disabled="!editingText.trim().length"
                          @click="submitEdit(m)"
                        >
                          저장
                        </button>
                      </div>
                    </template>
                    <template v-else>
                      <div :class="isDeleted(m) ? 'italic t-text-muted' : ''">
                        {{ isDeleted(m) ? "(삭제된 메시지)" : m.content }}
                      </div>
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
            <div v-for="m in store.activeMessages" :key="'tr:' + m.id" class="w-full">
              <div class="flex" :class="bubbleWrapClass(m)">
                <div class="max-w-[72%] min-w-0">
                  <div class="text-[11px] t-text-subtle flex items-center gap-2 w-full" :class="metaClass(m)">
                    <span class="font-mono">{{ translateTargetLang }}</span>
                    <span class="tabular-nums">{{ formatChatTime(m.createdAt) }}</span>
                    <span v-if="isDeleted(m)" class="t-text-faint">삭제됨</span>
                    <span v-else-if="translatePendingById[translationKeyFor(m)]" class="t-text-faint">번역 중…</span>
                  </div>
                  <div
                    class="mt-1 rounded-2xl border px-3 py-2 text-sm whitespace-pre-wrap break-words"
                    :class="bubbleClass(m)"
                  >
                    <div :class="isDeleted(m) ? 'italic t-text-muted' : ''">
                      {{ isDeleted(m) ? "(삭제된 메시지)" : translatedTextFor(m) }}
                    </div>
                    <div v-if="!isDeleted(m) && shouldShowTranslatePendingHint(m)" class="text-xs t-text-subtle mt-1">
                      (번역 대기)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="border-t t-border t-surface" :class="isMiniMode ? 'p-2' : 'p-3'">
      <div v-if="!isMiniMode" class="mb-2 flex items-center gap-3">
        <button
          class="px-3 py-2 text-sm rounded t-btn-secondary inline-flex items-center gap-2"
          :class="isListening ? 't-btn-primary' : ''"
          type="button"
          title="경청하기 (마이크)"
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
        <div class="relative flex-1 flex gap-2">
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
            <div class="mt-2 text-[11px] t-text-subtle">현재는 파일명만 메시지로 첨부됩니다.</div>
          </div>

          <div
            v-if="emojiOpen"
            ref="emojiPopover"
            class="emoji-popover absolute bottom-full mb-2 left-0 w-[320px] max-w-[80vw] rounded border t-border t-surface shadow-lg p-2"
          >
            <div class="flex items-center justify-between gap-2 mb-2">
              <div class="text-xs t-text-muted">이모티콘</div>
              <button type="button" class="px-2 py-1 text-xs rounded t-btn-secondary" @click="closeEmojiPicker">
                닫기
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
          <button class="py-2 text-sm rounded t-btn-secondary" :class="isMiniMode ? 'px-3' : 'px-6'" @click="send">
            전송
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
              <button type="button" class="px-2 py-1 text-xs rounded t-btn-secondary" @click="closeJarvisPopover">
                닫기
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

              <div
                v-for="c in currentJarvisContexts"
                :key="c.key"
                class="p-2 rounded border t-border t-row cursor-pointer"
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
                <div class="mt-1 text-xs t-text-muted break-words jarvis-context-preview">
                  {{ c.content }}
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

            <div class="mt-3 flex items-center justify-end gap-2">
              <button type="button" class="px-3 py-2 text-sm rounded t-btn-secondary" @click="closeJarvisPopover">
                취소
              </button>
              <button type="button" class="px-3 py-2 text-sm rounded t-btn-primary" @click="submitJarvis">
                질문
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
        <button class="px-3 py-2 text-sm rounded t-btn-primary" @click="submitJarvis">
          질문
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
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useSessionStore } from "../stores/session";
import { useWindowStore } from "../stores/window";
import { isJarvisTrigger, stripJarvisPrefix } from "@jarvis/shared";
import { fetchUsers, translateText } from "../api/http";
import CommonModal from "./ui/CommonModal.vue";

const store = useSessionStore();
const windowStore = useWindowStore();
const isMiniMode = computed(() => windowStore.miniMode);
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
  const content = String(m?.content ?? "").trim();
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

  // 음성 내용은 선택 메시지로 저장하고, 사용자는 별도 질문/요청을 입력
  await openJarvisPopoverWithPrompt("");
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
}

function onDocKeyDown(ev: KeyboardEvent) {
  if (ev.key === "Escape") closeAllComposerPopovers();
}

onMounted(() => {
  loadRecentEmojis();
  loadJarvisContextsByRoom();
  document.addEventListener("pointerdown", onDocPointerDown);
  document.addEventListener("keydown", onDocKeyDown);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onDocPointerDown);
  document.removeEventListener("keydown", onDocKeyDown);
  clearAttachments();
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
const messageMenuOpenId = ref<string>("");
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
  editingText.value = m.content ?? "";
}
function cancelEdit() {
  editingId.value = "";
  editingText.value = "";
}
function submitEdit(m: any) {
  if (!store.activeRoomId) return;
  const v = editingText.value.trim();
  if (!v) return;
  store.editMessage(store.activeRoomId, m.id, v);
  cancelEdit();
}

function toggleMessageMenu(m: any) {
  if (!canEditOrDelete(m)) return;
  messageMenuOpenId.value = messageMenuOpenId.value === m.id ? "" : m.id;
}
function closeMessageMenu() {
  messageMenuOpenId.value = "";
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
  const base = text.value.trim();
  if (!base && pendingAttachments.value.length === 0) return;

  const lines: string[] = [];
  if (base) lines.push(base);
  if (pendingAttachments.value.length) {
    lines.push(
      ...pendingAttachments.value.map((a) => {
        const icon = a.kind === "image" ? "🖼️" : "📎";
        return `[첨부] ${icon} ${a.file.name}`;
      })
    );
  }

  const content = lines.join("\n");
  store.sendMessage(store.activeRoomId, content);
  if (isJarvisTrigger(base || content)) {
    store.askJarvis(store.activeRoomId, stripJarvisPrefix(base || content));
  }
  text.value = "";
  clearAttachments();
  await nextTick();
  scrollToBottom();
}

function askJarvisQuick() {
  if (!store.activeRoomId) return;
  openJarvisPopoverWithPrompt("");
}

function closeJarvis() {
  jarvisOpen.value = false;
}

function submitJarvis() {
  if (!store.activeRoomId) return;
  const p = jarvisPrompt.value.trim();
  if (!p) return;
  const contexts = currentJarvisContexts.value;
  const ctxBlock = contexts.length
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
  jarvisOpen.value = false;
  jarvisPopoverOpen.value = false;
  pendingAiContextRoomId.value = store.activeRoomId;
  store.askJarvis(store.activeRoomId, ctxBlock);
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

  const content = String(m?.content ?? "").trim();
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
}

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
  white-space: pre-line;
}
</style>
