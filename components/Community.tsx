import React, { useState, useEffect, useRef, useCallback } from "react";
import { Message, CommunityUser } from "../types";
import {
  db,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  setDoc,
  doc,
  User,
} from "../firebase";
import Card from "./common/Card";
import Button from "./common/Button";
import {
  Send,
  Users,
  MessageCircle,
  Clock,
  User as UserIcon,
} from "lucide-react";

interface CommunityProps {
  user: User | null;
}

const Community: React.FC<CommunityProps> = ({ user }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<CommunityUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendHistoryRef = useRef<number[]>([]); // timestamps (ms)

  // Kullanıcı bilgilerini al
  const getUserDisplayName = useCallback(() => {
    if (!user) return "Misafir";
    if (user.displayName) return user.displayName;
    if (user.email) return user.email.split("@")[0];
    return user.isAnonymous ? `Misafir${user.uid.slice(-4)}` : "Kullanıcı";
  }, [user]);

  const getUserAvatar = useCallback(() => {
    return user?.photoURL || null;
  }, [user]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Mesajları dinle
  useEffect(() => {
    const messagesRef = collection(db, "community_messages");
    const messagesQuery = query(
      messagesRef,
      orderBy("timestamp", "desc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messageList: Message[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          messageList.push({
            id: doc.id,
            text: data.text,
            userId: data.userId,
            userName: data.userName,
            userAvatar: data.userAvatar,
            timestamp:
              data.timestamp?.toDate?.()?.toISOString() ||
              new Date().toISOString(),
            isAnonymous: data.isAnonymous || false,
          });
        });

        // Mesajları ters çevir (en eski üstte)
        setMessages(messageList.reverse());
        setIsLoading(false);
      },
      (error) => {
        console.error("Mesajlar yüklenirken hata:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Kullanıcının online durumunu güncelle
  useEffect(() => {
    if (!user) return;

    const updateUserPresence = async () => {
      try {
        // Kullanıcı ID'sini doküman ID olarak kullan (duplicate önleme)
        const userRef = doc(db, "community_users", user.uid);

        // setDoc ile upsert yap (varsa güncelle, yoksa oluştur)
        await setDoc(
          userRef,
          {
            uid: user.uid,
            displayName: getUserDisplayName(),
            photoURL: getUserAvatar(),
            isAnonymous: user.isAnonymous,
            lastSeen: serverTimestamp(),
          },
          { merge: true }
        ); // merge: true ile mevcut alanları koru
      } catch (error) {
        console.error("Kullanıcı durumu güncellenirken hata:", error);
      }
    };

    const setOffline = async () => {
      try {
        const userRef = doc(db, "community_users", user.uid);
        await setDoc(
          userRef,
          {
            uid: user.uid,
            displayName: getUserDisplayName(),
            photoURL: getUserAvatar(),
            isAnonymous: user.isAnonymous,
            lastSeen: new Date(Date.now() - 10 * 60 * 1000), // 10 dakika önce (offline)
          },
          { merge: true }
        );
      } catch (error) {
        console.error("Offline durumu ayarlanırken hata:", error);
      }
    };

    updateUserPresence();

    // Her 30 saniyede bir güncelle
    const interval = setInterval(updateUserPresence, 30000);

    // Sayfa kapatıldığında offline yap
    const handleBeforeUnload = () => {
      setOffline();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      setOffline(); // Component unmount olduğunda da offline yap
    };
  }, [user, getUserDisplayName, getUserAvatar]);

  // Online kullanıcıları dinle
  useEffect(() => {
    const usersRef = collection(db, "community_users");
    const usersQuery = query(usersRef, orderBy("lastSeen", "desc"), limit(50));

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const userMap = new Map<string, CommunityUser>();
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      snapshot.forEach((doc) => {
        const data = doc.data();
        const lastSeen = data.lastSeen?.toDate?.() || new Date(0);

        // Son 5 dakika içinde aktif olan kullanıcıları online say
        if (lastSeen > fiveMinutesAgo && data.uid) {
          // Map kullanarak duplicate kullanıcıları engelle
          const existingUser = userMap.get(data.uid);

          // Eğer aynı kullanıcı varsa, daha yeni olan lastSeen'i kullan
          if (!existingUser || lastSeen > new Date(existingUser.lastSeen)) {
            userMap.set(data.uid, {
              uid: data.uid,
              displayName: data.displayName || "Kullanıcı",
              photoURL: data.photoURL,
              isAnonymous: data.isAnonymous || false,
              lastSeen: lastSeen.toISOString(),
            });
          }
        }
      });

      // Map'i array'e çevir ve lastSeen'e göre sırala
      const userList = Array.from(userMap.values()).sort(
        (a, b) =>
          new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
      );

      setOnlineUsers(userList);
    });

    return () => unsubscribe();
  }, []);

  // Yeni mesajlar geldiğinde scroll
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Mesaj gönder
  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!newMessage.trim() || !user || isSending) return;

      // Basit rate limit: 1 mesaj / 3sn ve 5 mesaj / 60sn
      const now = Date.now();
      sendHistoryRef.current = sendHistoryRef.current.filter(t => now - t < 60_000);
      const last = sendHistoryRef.current[sendHistoryRef.current.length - 1] || 0;
      if (now - last < 3000) {
        setError('Çok hızlı gönderiyorsun. Lütfen birkaç saniye bekle.');
        return;
      }
      if (sendHistoryRef.current.length >= 5) {
        setError('Bir dakika içinde çok fazla mesaj gönderdin. Lütfen biraz bekle.');
        return;
      }

      // Basit içerik moderasyonu: link ve kaba sözleri engelle
      const text = newMessage.trim();
      const hasUrl = /https?:\/\/|www\./i.test(text);
      const banned = [
        'siktir', 'amk', 'aq', 'orospu', 'salak', 'gerizekalı', 'piç' // temel örnek liste
      ];
      const containsBanned = banned.some(w => text.toLowerCase().includes(w));
      if (hasUrl) {
        setError('Mesajlarda bağlantı paylaşımı devre dışıdır.');
        return;
      }
      if (containsBanned) {
        setError('Mesaj içinde uygun olmayan kelimeler tespit edildi. Lütfen düzenleyin.');
        return;
      }

      setIsSending(true);

      try {
        // Mesaj gönder
        const messagesRef = collection(db, "community_messages");
        await addDoc(messagesRef, {
          text,
          userId: user.uid,
          userName: getUserDisplayName(),
          userAvatar: getUserAvatar(),
          timestamp: serverTimestamp(),
          isAnonymous: user.isAnonymous,
        });

        // Kullanıcı presence'ını güncelle (mesaj gönderince aktif olduğunu göster)
        const userRef = doc(db, "community_users", user.uid);
        await setDoc(
          userRef,
          {
            uid: user.uid,
            displayName: getUserDisplayName(),
            photoURL: getUserAvatar(),
            isAnonymous: user.isAnonymous,
            lastSeen: serverTimestamp(),
          },
          { merge: true }
        );

    setNewMessage("");
    setError(null);
    sendHistoryRef.current.push(now);
      } catch (error) {
        console.error("Mesaj gönderilirken hata:", error);
    setError("Mesaj gönderilemedi. Lütfen tekrar deneyin.");
      } finally {
        setIsSending(false);
      }
    },
  [newMessage, user, isSending, getUserDisplayName, getUserAvatar]
  );

  // Zaman formatla
  const formatTime = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Şimdi";
    if (diffInMinutes < 60) return `${diffInMinutes}dk önce`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}s önce`;
    return date.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
      {/* Ana Chat Alanı */}
      <div className="lg:col-span-3">
        <Card title="Topluluk Sohbeti" fullHeight>
          <div className="flex flex-col h-full">
            {/* Mesajlar */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-light-primary dark:border-dark-primary mx-auto mb-3"></div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Mesajlar yükleniyor...
                    </p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex justify-center items-center h-full">
                  <div className="text-center">
                    <MessageCircle
                      size={48}
                      className="text-gray-300 dark:text-gray-600 mx-auto mb-3"
                    />
                    <p className="text-gray-500 dark:text-gray-400 mb-2">
                      Henüz mesaj yok
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      İlk mesajı sen gönder!
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg transition-colors ${
                      message.userId === user?.uid
                        ? "bg-light-primary/10 dark:bg-dark-primary/10 ml-8"
                        : "bg-gray-50 dark:bg-gray-800/50 mr-8"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {message.userAvatar ? (
                        <img
                          src={message.userAvatar}
                          alt={message.userName}
                          className="w-8 h-8 rounded-full"
                          loading="lazy"
                          decoding="async"
                          width={32}
                          height={32}
                        />
                      ) : (
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                            message.isAnonymous
                              ? "bg-gray-500"
                              : "bg-gradient-to-r from-blue-500 to-purple-500"
                          }`}
                        >
                          {message.isAnonymous ? (
                            <UserIcon size={16} />
                          ) : (
                            message.userName.charAt(0).toUpperCase()
                          )}
                        </div>
                      )}
                    </div>

                    {/* Mesaj İçeriği */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span
                          className={`font-medium text-sm ${
                            message.userId === user?.uid
                              ? "text-light-primary dark:text-dark-primary"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {message.userName}
                        </span>
                        {message.isAnonymous && (
                          <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                            Misafir
                          </span>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                          <Clock size={12} className="mr-1" />
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      <p className="text-gray-800 dark:text-gray-200 text-sm break-words">
                        {message.text}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Mesaj Gönderme Formu */}
            <form onSubmit={handleSendMessage} className="flex flex-col space-y-2">
              {error && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}
              <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => { setNewMessage(e.target.value); if (error) setError(null); }}
                placeholder="Mesajınızı yazın..."
                className="flex-1 p-3 border rounded-lg bg-light-bg dark:bg-dark-card border-light-border dark:border-dark-border focus:ring-light-primary focus:border-light-primary"
                maxLength={500}
                disabled={isSending}
              />
              <Button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="px-4"
              >
                {isSending ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Send size={18} />
                )}
              </Button>
              </div>
            </form>
          </div>
        </Card>
      </div>

      {/* Online Kullanıcılar */}
      <div className="lg:col-span-1">
        <Card title="Online Kullanıcılar" fullHeight>
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Users size={16} />
              <span>{onlineUsers.length} kişi online</span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {onlineUsers.map((onlineUser: CommunityUser) => (
                <div
                  key={onlineUser.uid}
                  className={`flex items-center space-x-2 p-2 rounded-lg ${
                    onlineUser.uid === user?.uid
                      ? "bg-light-primary/10 dark:bg-dark-primary/10"
                      : "bg-gray-50 dark:bg-gray-800/50"
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative">
                    {onlineUser.photoURL ? (
                      <img
                        src={onlineUser.photoURL}
                        alt={onlineUser.displayName}
                        className="w-6 h-6 rounded-full"
                        loading="lazy"
                        decoding="async"
                        width={24}
                        height={24}
                      />
                    ) : (
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                          onlineUser.isAnonymous
                            ? "bg-gray-500"
                            : "bg-gradient-to-r from-green-500 to-blue-500"
                        }`}
                      >
                        {onlineUser.isAnonymous ? (
                          <UserIcon size={12} />
                        ) : (
                          onlineUser.displayName.charAt(0).toUpperCase()
                        )}
                      </div>
                    )}
                    {/* Online Indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                  </div>

                  {/* İsim */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        onlineUser.uid === user?.uid
                          ? "text-light-primary dark:text-dark-primary"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {onlineUser.displayName}
                      {onlineUser.uid === user?.uid && " (Sen)"}
                    </p>
                    {onlineUser.isAnonymous && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Misafir
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {onlineUsers.length === 0 && (
                <div className="text-center py-8">
                  <Users
                    size={32}
                    className="text-gray-300 dark:text-gray-600 mx-auto mb-2"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Henüz kimse online değil
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Community;
